import { test, describe } from "node:test";
import assert from "node:assert";
import {
  startInterviewSchema,
  submitAnswerSchema,
  nextQuestionSchema,
  finishInterviewSchema,
} from "../../src/lib/validations/interview.ts";

describe("Interview Validation Schemas", () => {
  const validUUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  test("startInterviewSchema accepts valid payload with 5 questions", () => {
    const input = {
      roleId: validUUID,
      difficulty: "Intermediate" as const,
      targetCount: 5 as const,
    };

    const result = startInterviewSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  test("startInterviewSchema accepts 10 questions and optional resumeId", () => {
    const input = {
      roleId: validUUID,
      difficulty: "Advanced" as const,
      targetCount: 10 as const,
      resumeId: validUUID,
    };

    const result = startInterviewSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  test("startInterviewSchema rejects unsupported target counts", () => {
    const input = {
      roleId: validUUID,
      difficulty: "Beginner" as const,
      targetCount: 7, // Not 5 or 10
    };

    const result = startInterviewSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  test("submitAnswerSchema accepts valid response turn", () => {
    const input = {
      sessionId: validUUID,
      question: "What is backpropagation?",
      userAnswer: "Backpropagation calculates gradients of the loss with respect to weights using the chain rule.",
      position: 1,
      topic: "Deep Learning",
    };

    const result = submitAnswerSchema.safeParse(input);
    assert.strictEqual(result.success, true);
  });

  test("submitAnswerSchema rejects blank user answer", () => {
    const input = {
      sessionId: validUUID,
      question: "What is backpropagation?",
      userAnswer: " ",
      position: 1,
    };

    const result = submitAnswerSchema.safeParse(input);
    assert.strictEqual(result.success, false);
  });

  test("finishInterviewSchema validates valid session UUID", () => {
    const result = finishInterviewSchema.safeParse({ sessionId: validUUID });
    assert.strictEqual(result.success, true);

    const invalid = finishInterviewSchema.safeParse({ sessionId: "not-a-uuid" });
    assert.strictEqual(invalid.success, false);
  });
});
