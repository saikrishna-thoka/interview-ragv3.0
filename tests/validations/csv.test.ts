import { test, describe } from "node:test";
import assert from "node:assert";
import {
  columnMappingSchema,
  classifiedItemSchema,
  ingestBatchPayloadSchema,
} from "../../src/lib/validations/csv.ts";

describe("CSV and Ingestion Validation Schemas", () => {
  test("columnMappingSchema accepts required questionColumn and optional columns", () => {
    const valid = {
      questionColumn: "Interview Question",
      answerColumn: "Solution",
      topicColumn: "Domain",
      difficultyColumn: "Level",
    };

    const parsed = columnMappingSchema.safeParse(valid);
    assert.strictEqual(parsed.success, true);
  });

  test("columnMappingSchema rejects when questionColumn is missing or empty", () => {
    const invalid = {
      questionColumn: "",
    };

    const parsed = columnMappingSchema.safeParse(invalid);
    assert.strictEqual(parsed.success, false);
  });

  test("classifiedItemSchema validates classified question from Groq", () => {
    const valid = {
      index: 0,
      cleaned_question: "How does gradient descent optimize weights in neural networks?",
      role: "ML Engineer",
      topic: "Optimization",
      difficulty: "Intermediate",
      model_answer: "By calculating the derivative of the loss function with respect to weights.",
    };

    const parsed = classifiedItemSchema.safeParse(valid);
    assert.strictEqual(parsed.success, true);
  });

  test("classifiedItemSchema rejects invalid role name not in seed list", () => {
    const invalid = {
      index: 0,
      cleaned_question: "What is backpropagation?",
      role: "Invalid Unreal Engineer",
      topic: "Deep Learning",
      difficulty: "Intermediate",
    };

    const parsed = classifiedItemSchema.safeParse(invalid);
    assert.strictEqual(parsed.success, false);
  });

  test("ingestBatchPayloadSchema enforces batch size limits", () => {
    const validBatch = {
      fileName: "questions.csv",
      totalRows: 50,
      batchIndex: 0,
      rows: [
        { question: "What is precision and recall?" },
        { question: "Explain the attention mechanism in Transformers." },
      ],
    };

    const parsed = ingestBatchPayloadSchema.safeParse(validBatch);
    assert.strictEqual(parsed.success, true);
  });
});
