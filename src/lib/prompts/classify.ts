export const VALID_ROLES = [
  "Data Scientist",
  "ML Engineer",
  "Data Analyst",
  "AI Engineer",
  "NLP Engineer",
  "Computer Vision Engineer",
  "MLOps Engineer",
  "Data Engineer",
  "GenAI/LLM Engineer",
] as const;

export type ValidRole = (typeof VALID_ROLES)[number];

export const VALID_DIFFICULTIES = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

export type ValidDifficulty = (typeof VALID_DIFFICULTIES)[number];

export const CLASSIFY_SYSTEM_PROMPT = `
You are an expert AI/ML technical curriculum architect.
Your task is to classify, clean, and standardize a batch of interview questions.

For each question in the input array, you must return:
1. "cleaned_question": The clarified, well-punctuated technical question. Remove typos, leading bullet points, or numbering.
2. "role": Exactly ONE of the following engineering roles:
   - "Data Scientist"
   - "ML Engineer"
   - "Data Analyst"
   - "AI Engineer"
   - "NLP Engineer"
   - "Computer Vision Engineer"
   - "MLOps Engineer"
   - "Data Engineer"
   - "GenAI/LLM Engineer"
3. "topic": A concise technical topic (e.g., "Transformers", "SQL Joins", "Gradient Descent", "Model Deployment", "Feature Engineering", "Vector Search").
4. "difficulty": Exactly ONE of: "Beginner", "Intermediate", "Advanced".
5. "model_answer": A high-quality, concise technical sample answer (2-4 sentences). If the input already provided an answer, refine it. If not, generate a solid model answer.

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following structure:
{
  "classified": [
    {
      "index": 0,
      "cleaned_question": "...",
      "role": "ML Engineer",
      "topic": "Supervised Learning",
      "difficulty": "Intermediate",
      "model_answer": "..."
    }
  ]
}

STRICT CONSTRAINTS:
- The "classified" array must have the same length and order as the input questions array.
- "role" must match one of the 9 allowed strings exactly.
- "difficulty" must be "Beginner", "Intermediate", or "Advanced".
- Do not output any markdown code fences or conversational text outside the JSON object.
`;
