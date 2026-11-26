import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitAnswerSchema } from "@/lib/validations/interview";
import { callGroqWithRetry } from "@/lib/groq";
import { EVALUATE_ANSWER_SYSTEM_PROMPT } from "@/lib/prompts/answer-eval";

export const dynamic = "force-dynamic";

interface AnswerEvaluationResponse {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  sample_answer: string;
  feedback: string;
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
    const parsed = submitAnswerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission data", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { sessionId, question, userAnswer, position, topic, modelAnswerReference } =
      parsed.data;
    const adminSupabase = createAdminClient();

    // Verify session ownership
    const { data: session, error: sessionError } = await adminSupabase
      .from("interview_sessions")
      .select("id, user_id, target_count, status")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session || session.user_id !== user.id) {
      return NextResponse.json({ error: "Interview session not found or forbidden" }, { status: 403 });
    }

    // Evaluate answer with Groq
    const modelName = process.env.GROQ_MODEL_GENERATION || "openai/gpt-oss-120b";
    const promptContent = `
QUESTION:
${question}

TOPIC:
${topic || "AI/ML Technical"}

CANDIDATE ANSWER:
${userAnswer}

REFERENCE CONTEXT / MODEL ANSWER INSPIRATION:
${modelAnswerReference || "Evaluate based on standard AI/ML engineering standards."}

Evaluate the candidate's answer now.
`;

    const evaluation = await callGroqWithRetry<AnswerEvaluationResponse>({
      model: modelName,
      messages: [
        { role: "system", content: EVALUATE_ANSWER_SYSTEM_PROMPT },
        { role: "user", content: promptContent },
      ],
      temperature: 0.1,
      responseFormatJson: true,
    });

    const normalizedScore = Math.max(0, Math.min(10, Math.round(Number(evaluation.score) || 0)));

    // Save turn record to session_turns
    const { data: turn, error: turnError } = await adminSupabase
      .from("session_turns")
      .insert({
        session_id: sessionId,
        question,
        user_answer: userAnswer,
        score: normalizedScore,
        position,
        evaluation: {
          verdict: evaluation.verdict,
          strengths: evaluation.strengths || [],
          gaps: evaluation.gaps || [],
          sample_answer: evaluation.sample_answer || "",
          feedback: evaluation.feedback || "",
        },
      })
      .select("id")
      .single();

    if (turnError) {
      throw new Error("Failed to save session turn: " + turnError.message);
    }

    const isCompleted = position >= session.target_count;

    const evalData = {
      verdict: evaluation.verdict,
      strengths: evaluation.strengths || [],
      gaps: evaluation.gaps || [],
      sample_answer: evaluation.sample_answer || "",
      feedback: evaluation.feedback || "",
    };

    return NextResponse.json({
      success: true,
      turnId: turn?.id,
      position,
      score: normalizedScore,
      evaluation: evalData,
      verdict: evaluation.verdict,
      strengths: evaluation.strengths || [],
      gaps: evaluation.gaps || [],
      sample_answer: evaluation.sample_answer || "",
      feedback: evaluation.feedback || "",
      isCompleted,
    });
  } catch (error) {
    console.error("[Evaluate Answer Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
