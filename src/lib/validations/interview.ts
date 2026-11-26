import { z } from "zod";

export const startInterviewSchema = z.object({
  roleId: z.string().uuid("Please select a target role"),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  targetCount: z.union([z.literal(5), z.literal(10)]),
  resumeId: z.string().uuid().nullable().optional(),
});

export type StartInterviewInput = z.infer<typeof startInterviewSchema>;

export const nextQuestionSchema = z.object({
  sessionId: z.string().uuid("Valid sessionId is required"),
});

export type NextQuestionInput = z.infer<typeof nextQuestionSchema>;

export const submitAnswerSchema = z.object({
  sessionId: z.string().uuid("Valid sessionId is required"),
  question: z.string().min(5, "Question text required"),
  userAnswer: z.string().min(2, "Please provide an answer before submitting"),
  position: z.number().int().positive(),
  topic: z.string().optional(),
  modelAnswerReference: z.string().optional(),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

export const finishInterviewSchema = z.object({
  sessionId: z.string().uuid("Valid sessionId is required"),
});

export type FinishInterviewInput = z.infer<typeof finishInterviewSchema>;
