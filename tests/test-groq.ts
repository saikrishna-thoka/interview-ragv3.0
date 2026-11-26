import { callGroqWithRetry } from "../src/lib/groq";

async function testGroq() {
  console.log("1. Testing Groq generation with model:", process.env.GROQ_MODEL_GENERATION);
  try {
    const res = await callGroqWithRetry<{ status: string; engine: string }>({
      model: process.env.GROQ_MODEL_GENERATION || "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: 'You are a test helper. Return JSON: {"status": "ok", "engine": "generation"}' },
        { role: "user", content: "Ping" }
      ],
      responseFormatJson: true,
    });
    console.log("Generation Response:", res);
  } catch (err) {
    console.error("Generation Error:", err instanceof Error ? err.message : String(err));
  }

  console.log("\n2. Testing Groq classification with model:", process.env.GROQ_MODEL_CLASSIFY);
  try {
    const res2 = await callGroqWithRetry<{ status: string; engine: string }>({
      model: process.env.GROQ_MODEL_CLASSIFY || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: 'You are a test helper. Return JSON: {"status": "ok", "engine": "classification"}' },
        { role: "user", content: "Ping" }
      ],
      responseFormatJson: true,
    });
    console.log("Classification Response:", res2);
  } catch (err) {
    console.error("Classification Error:", err instanceof Error ? err.message : String(err));
  }
}

testGroq();
