import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finishInterviewSchema } from "@/lib/validations/interview";
import { callGroqWithRetry } from "@/lib/groq";
import { INTERVIEW_SUMMARY_SYSTEM_PROMPT } from "@/lib/prompts/interview-summary";

export const dynamic = "force-dynamic";

interface SummaryResponse {
  overall_score: number;
  grade: string;
  performance_overview: string;
  top_strengths: string[];
  key_areas_for_improvement: string[];
  recommended_next_topics: string[];
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
    const parsed = finishInterviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { sessionId } = parsed.data;
    const adminSupabase = createAdminClient();

    // Load session and verify ownership
    const { data: session, error: sessionError } = await adminSupabase
      .from("interview_sessions")
      .select("id, user_id, difficulty, target_count, roles(name)")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session || session.user_id !== user.id) {
      return NextResponse.json({ error: "Session not found or forbidden" }, { status: 403 });
    }

    // Load all completed turns
    const { data: turns, error: turnsError } = await adminSupabase
      .from("session_turns")
      .select("position, question, user_answer, score, evaluation")
      .eq("session_id", sessionId)
      .order("position", { ascending: true });

    if (turnsError || !turns || turns.length === 0) {
      return NextResponse.json(
        { error: "No completed interview turns found to summarize." },
        { status: 400 }
      );
    }

    const totalScore = turns.reduce((acc, t) => acc + (t.score || 0), 0);
    const averageScore = Number((totalScore / turns.length).toFixed(1));

    // Generate comprehensive coaching summary with Groq
    const modelName = process.env.GROQ_MODEL_GENERATION || "openai/gpt-oss-120b";
    const promptContent = `
TARGET ROLE: ${session.roles?.name || "AI/ML Engineer"}
DIFFICULTY LEVEL: ${session.difficulty}
QUESTIONS COMPLETED: ${turns.length} of ${session.target_count}
AVERAGE SCORE: ${averageScore} / 10

TURNS BREAKDOWN:
${turns
  .map(
    (t) => `
[Question ${t.position}]
Q: ${t.question}
Candidate Answer: ${t.user_answer}
Score: ${t.score} / 10
Evaluation Verdict: ${(t.evaluation as { verdict?: string })?.verdict || "Evaluated"}
Gaps: ${(t.evaluation as { gaps?: string[] })?.gaps?.join("; ") || "None"}
`
  )
  .join("\n")}

Produce the final comprehensive interview summary report.
`;

    const summaryResult = await callGroqWithRetry<SummaryResponse>({
      model: modelName,
      messages: [
        { role: "system", content: INTERVIEW_SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: promptContent },
      ],
      temperature: 0.2,
      responseFormatJson: true,
    });

    const finalSummary = {
      overall_score: summaryResult?.overall_score ?? Math.round(averageScore * 10),
      grade: summaryResult?.grade ?? "Strong Candidate",
      performance_overview:
        summaryResult?.performance_overview ??
        `The candidate answered ${turns.length} questions with an average score of ${averageScore}/10.`,
      top_strengths: Array.isArray(summaryResult?.top_strengths) ? summaryResult.top_strengths : [],
      key_areas_for_improvement: Array.isArray(summaryResult?.key_areas_for_improvement)
        ? summaryResult.key_areas_for_improvement
        : [],
      recommended_next_topics: Array.isArray(summaryResult?.recommended_next_topics)
        ? summaryResult.recommended_next_topics
        : [],
      average_score_out_of_10: averageScore,
      total_questions: turns.length,
      completed_at: new Date().toISOString(),
    };

    // Update interview_sessions row
    const { error: updateError } = await adminSupabase
      .from("interview_sessions")
      .update({
        status: "completed",
        summary: finalSummary,
      })
      .eq("id", sessionId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      summary: finalSummary,
      averageScore,
    });
  } catch (error) {
    console.error("[Finish Interview Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
