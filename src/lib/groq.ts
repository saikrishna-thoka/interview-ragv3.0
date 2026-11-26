import Groq from "groq-sdk";

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set on the server.");
  }

  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey,
    });
  }

  return groqInstance;
}

export interface GroqCompletionOptions {
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
}

/**
 * Executes a Groq API call with exponential backoff on HTTP 429 / 5xx rate limits and transient errors.
 */
export async function callGroqWithRetry<T = unknown>(
  options: GroqCompletionOptions,
  maxRetries = 3
): Promise<T> {
  const client = getGroqClient();
  const model =
    options.model ||
    process.env.GROQ_MODEL_GENERATION ||
    "openai/gpt-oss-120b";

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.responseFormatJson
          ? { type: "json_object" }
          : undefined,
      });

      const content = response.choices[0]?.message?.content?.trim() || "";
      if (!content) {
        throw new Error("Groq returned an empty text completion.");
      }

      if (options.responseFormatJson) {
        let cleaned = content.trim();
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
          cleaned = cleaned.slice(firstBrace, lastBrace + 1);
        } else {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        }
        return JSON.parse(cleaned) as T;
      }

      return content as unknown as T;
    } catch (error: unknown) {
      lastError = error;
      const errorObj = error as { status?: number; message?: string };
      const isRateLimit = errorObj?.status === 429 || errorObj?.message?.includes("rate_limit");
      const isServerTransient = errorObj?.status && errorObj.status >= 500;

      if ((isRateLimit || isServerTransient) && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(
          `[Groq Retry] Attempt ${attempt} failed with ${errorObj.status || "error"}. Retrying in ${Math.round(delayMs)}ms...`
        );
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }

      break;
    }
  }

  throw new Error(
    `Groq API call failed after ${maxRetries} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
