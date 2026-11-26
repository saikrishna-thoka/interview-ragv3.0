import { callGroqWithRetry } from "../src/lib/groq";
import { INTERVIEW_SUMMARY_SYSTEM_PROMPT } from "../src/lib/prompts/interview-summary";

async function testSummary() {
  const model = process.env.GROQ_MODEL_GENERATION || "openai/gpt-oss-120b";
  console.log("Testing summary with model:", model);

  const sampleTurn = `
TARGET ROLE: ML Engineer
DIFFICULTY LEVEL: Intermediate
QUESTIONS COMPLETED: 1 of 5
AVERAGE SCORE: 8 / 10

TURNS BREAKDOWN:
[Question 1]
Q: Explain the bias-variance tradeoff in machine learning.
Candidate Answer: Bias is underfitting and variance is overfitting. We tune model complexity to balance them.
Score: 8 / 10
Evaluation Verdict: Strong conceptual understanding
Gaps: Could mention regularization techniques
`;

  try {
    const res = await callGroqWithRetry({
      model,
      messages: [
        { role: "system", content: INTERVIEW_SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: sampleTurn }
      ],
      responseFormatJson: true,
    });
    console.log("Summary result:", res);
  } catch (err) {
    console.error("Summary test error:", err);
  }
}

testSummary();
