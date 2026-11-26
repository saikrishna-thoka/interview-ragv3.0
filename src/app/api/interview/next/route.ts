import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextQuestionSchema } from "@/lib/validations/interview";
import { embed } from "@/lib/embeddings";
import { callGroqWithRetry } from "@/lib/groq";
import { GENERATE_QUESTION_SYSTEM_PROMPT } from "@/lib/prompts/interview-gen";

export const dynamic = "force-dynamic";

interface GeneratedQuestionResponse {
  question: string;
  topic: string;
  difficulty: string;
  is_grounded: boolean;
  grounding_source?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = nextQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    const { sessionId } = parsed.data;
    const adminSupabase = createAdminClient();

    // 1. Fetch interview session and verify ownership
    const { data: session, error: sessionError } = await adminSupabase
      .from("interview_sessions")
      .select(`
        id,
        user_id,
        role_id,
        difficulty,
        target_count,
        status,
        resume_id,
        roles ( id, name )
      `)
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: Not your session" }, { status: 403 });
    }

    // 2. Fetch past turns in this session to calculate current question position and avoid repeats
    const { data: turns, error: turnsError } = await adminSupabase
      .from("session_turns")
      .select("position, question")
      .eq("session_id", sessionId)
      .order("position", { ascending: true });

    if (turnsError) {
      throw turnsError;
    }

    const currentPosition = (turns?.length || 0) + 1;
    if (currentPosition > session.target_count) {
      return NextResponse.json({
        isFinished: true,
        message: "All target interview questions have already been answered.",
      });
    }

    const previousQuestions = (turns || []).map((t) => t.question);

    // 3. Optional resume background for personalization
    let candidateResumeSkills = "";
    if (session.resume_id) {
      const { data: resume } = await adminSupabase
        .from("resumes")
        .select("extracted_text, ats_report")
        .eq("id", session.resume_id)
        .single();
      if (resume?.extracted_text) {
        candidateResumeSkills = resume.extracted_text.slice(0, 1000);
      }
    }

    const roleName = session.roles?.name || "AI/ML Engineer";

    // 4. Retrieve top-5 approved grounding questions via match_questions
    const searchQuery = `${roleName} ${session.difficulty} interview technical concept`;
    const [queryVector] = await embed([searchQuery]);

    let groundingPassages: string[] = [];
    if (queryVector && queryVector.length === 384) {
      const { data: matched } = await adminSupabase.rpc("match_questions", {
        query_embedding: `[${queryVector.join(",")}]`,
        match_role_id: session.role_id,
        match_difficulty: session.difficulty,
        match_count: 5,
        similarity_threshold: 0.1,
      });

      if (matched && matched.length > 0) {
        groundingPassages = matched.map(
          (m, i) =>
            `[Grounding Question ${i + 1}] Topic: ${m.topic || "General"} | Question: ${
              m.question
            } | Model Answer Reference: ${m.model_answer || "N/A"}`
        );
      }
    }

    // 5. Generate next interview question with Groq
    const userPromptContent = `
TARGET ROLE: ${roleName}
DIFFICULTY: ${session.difficulty}
CURRENT POSITION: Question ${currentPosition} of ${session.target_count}

PREVIOUSLY ASKED QUESTIONS (DO NOT REPEAT):
${previousQuestions.length > 0 ? previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "None yet."}

CANDIDATE RESUME HIGHLIGHTS:
${candidateResumeSkills || "Not provided."}

GROUNDING PASSAGES (RETRIEVED FROM VERIFIED QUESTION BANK):
${groundingPassages.length > 0 ? groundingPassages.join("\n\n") : "NO GROUNDING PASSAGES RETRIEVED (Use standard technical knowledge)."}

Formulate the next clear interview question.
`;

    const modelName = process.env.GROQ_MODEL_GENERATION || "openai/gpt-oss-120b";
    const groqResponse = await callGroqWithRetry<GeneratedQuestionResponse>({
      model: modelName,
      messages: [
        { role: "system", content: GENERATE_QUESTION_SYSTEM_PROMPT },
        { role: "user", content: userPromptContent },
      ],
      temperature: 0.3,
      responseFormatJson: true,
    });

    return NextResponse.json({
      success: true,
      position: currentPosition,
      totalCount: session.target_count,
      question: groqResponse.question,
      topic: groqResponse.topic || roleName,
      difficulty: groqResponse.difficulty || session.difficulty,
      is_grounded: groundingPassages.length > 0 && groqResponse.is_grounded !== false,
      grounding_source: groundingPassages.length > 0 ? "Verified Question Bank" : "General AI/ML Knowledge",
    });
  } catch (error) {
    console.error("[Next Question Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
