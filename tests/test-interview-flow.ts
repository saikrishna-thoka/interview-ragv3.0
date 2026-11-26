import { createClient } from "@supabase/supabase-js";
import { callGroqWithRetry } from "../src/lib/groq";
import { EVALUATE_ANSWER_SYSTEM_PROMPT } from "../src/lib/prompts/answer-eval";
import { INTERVIEW_SUMMARY_SYSTEM_PROMPT } from "../src/lib/prompts/interview-summary";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runFullInterviewIntegrationTest() {
  console.log("=== STARTING FULL INTERVIEW SIMULATION TEST ===");

  // 1. Get user & role
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === "admin@rag") || users.users[0];
  console.log("1. User:", user.email, user.id);

  const { data: roles } = await supabase.from("roles").select("id, name").limit(1);
  const role = roles![0];
  console.log("2. Role:", role.name, role.id);

  // 2. Create session
  const { data: session, error: sessErr } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      role_id: role.id,
      difficulty: "Intermediate",
      target_count: 5,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (sessErr) throw sessErr;
  console.log("3. Session created:", session.id);

  // 3. Simulate Answer Submission & Evaluation
  console.log("4. Evaluating Question 1 Answer with Groq...");
  const question = "What is the bias-variance tradeoff in machine learning?";
  const userAnswer = "Bias causes underfitting when model is too simple, while variance causes overfitting when model is too sensitive to noise. The goal is to minimize total error by finding the optimal balance.";

  const evaluation = await callGroqWithRetry<any>({
    model: process.env.GROQ_MODEL_GENERATION || "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: EVALUATE_ANSWER_SYSTEM_PROMPT },
      { role: "user", content: `QUESTION: ${question}\nTOPIC: Machine Learning\nCANDIDATE ANSWER: ${userAnswer}` },
    ],
    temperature: 0.1,
    responseFormatJson: true,
  });

  const normalizedScore = Math.max(0, Math.min(10, Math.round(Number(evaluation.score) || 0)));
  console.log("Turn Evaluation score:", normalizedScore, "verdict:", evaluation.verdict);

  const evalData = {
    verdict: evaluation.verdict,
    strengths: evaluation.strengths || [],
    gaps: evaluation.gaps || [],
    sample_answer: evaluation.sample_answer || "",
    feedback: evaluation.feedback || "",
  };

  // Insert session_turn
  const { data: turn, error: turnErr } = await supabase
    .from("session_turns")
    .insert({
      session_id: session.id,
      question,
      user_answer: userAnswer,
      score: normalizedScore,
      position: 1,
      evaluation: evalData,
    })
    .select("id")
    .single();

  if (turnErr) throw turnErr;
  console.log("5. Turn recorded successfully:", turn.id);

  // 4. Test Final Summary Generation
  console.log("6. Generating Final Summary Coaching Report with Groq...");
  const promptContent = `
TARGET ROLE: ${role.name}
DIFFICULTY LEVEL: Intermediate
QUESTIONS COMPLETED: 1 of 5
AVERAGE SCORE: ${normalizedScore} / 10

TURNS BREAKDOWN:
[Question 1]
Q: ${question}
Candidate Answer: ${userAnswer}
Score: ${normalizedScore} / 10
Evaluation Verdict: ${evaluation.verdict}
Gaps: ${evaluation.gaps?.join("; ")}
`;

  const summaryResult = await callGroqWithRetry<any>({
    model: process.env.GROQ_MODEL_GENERATION || "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: INTERVIEW_SUMMARY_SYSTEM_PROMPT },
      { role: "user", content: promptContent },
    ],
    temperature: 0.2,
    responseFormatJson: true,
  });

  const finalSummary = {
    overall_score: summaryResult?.overall_score ?? Math.round(normalizedScore * 10),
    grade: summaryResult?.grade ?? "Strong Candidate",
    performance_overview: summaryResult?.performance_overview ?? "Completed.",
    top_strengths: summaryResult?.top_strengths || [],
    key_areas_for_improvement: summaryResult?.key_areas_for_improvement || [],
    recommended_next_topics: summaryResult?.recommended_next_topics || [],
    average_score_out_of_10: normalizedScore,
    total_questions: 1,
    completed_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("interview_sessions")
    .update({
      status: "completed",
      summary: finalSummary,
    })
    .eq("id", session.id);

  if (updateError) throw updateError;
  console.log("7. Final Summary persisted into interview_sessions!");
  console.log("   Grade:", finalSummary.grade);
  console.log("   Overall Score:", finalSummary.overall_score);
  console.log("   Top Strengths:", finalSummary.top_strengths.length);
  console.log("\n=== ALL INTERVIEW WORKFLOW CHECKS PASSED ===");
}

runFullInterviewIntegrationTest().catch(console.error);
