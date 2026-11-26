import { test, describe } from "node:test";
import assert from "node:assert";
import { atsRequestSchema, atsReportSchema } from "../../src/lib/validations/resume.ts";

describe("Resume and ATS Validation Schemas", () => {
  const validUUID1 = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const validUUID2 = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

  test("atsRequestSchema validates valid resumeId and roleId UUIDs", () => {
    const input = {
      resumeId: validUUID1,
      roleId: validUUID2,
    };

    const result = atsRequestSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  test("atsRequestSchema rejects invalid UUIDs", () => {
    const input = {
      resumeId: "invalid-id",
      roleId: validUUID2,
    };

    const result = atsRequestSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  test("atsReportSchema validates structured Groq ATS analysis response", () => {
    const validReport = {
      overall_score: 84,
      section_scores: {
        skills: 88,
        experience: 82,
        education: 85,
        formatting: 90,
        keywords: 75,
      },
      matched_keywords: ["PyTorch", "Transformers", "pgvector", "Docker"],
      missing_keywords: ["MLOps", "vLLM", "Distributed Training"],
      suggestions: [
        "Include quantifiable metrics in recent projects.",
        "Add experience with low-latency LLM serving.",
        "Highlight vector search architecture trade-offs.",
        "Add GitHub links to verifiable code repositories.",
        "Clarify contribution to model deployment vs training.",
      ],
    };

    const result = atsReportSchema.safeParse(validReport);
    assert.strictEqual(result.success, true);
  });

  test("atsReportSchema rejects scores out of 0-100 range", () => {
    const invalidReport = {
      overall_score: 110, // Invalid: exceeds 100
      section_scores: {
        skills: 80,
        experience: 80,
        education: 80,
        formatting: 80,
        keywords: 80,
      },
      matched_keywords: [],
      missing_keywords: [],
      suggestions: ["Improve formatting."],
    };

    const result = atsReportSchema.safeParse(invalidReport);
    assert.strictEqual(result.success, false);
  });
});
