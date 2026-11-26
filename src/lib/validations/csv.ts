import { z } from "zod";
import { VALID_ROLES, VALID_DIFFICULTIES } from "../prompts/classify";

export const columnMappingSchema = z.object({
  questionColumn: z.string().min(1, "Question column is required"),
  answerColumn: z.string().optional(),
  topicColumn: z.string().optional(),
  difficultyColumn: z.string().optional(),
});

export type ColumnMapping = z.infer<typeof columnMappingSchema>;

export const classifiedItemSchema = z.object({
  index: z.number(),
  cleaned_question: z.string().min(5, "Cleaned question is too short"),
  role: z.enum(VALID_ROLES),
  topic: z.string().min(2, "Topic is required"),
  difficulty: z.enum(VALID_DIFFICULTIES),
  model_answer: z.string().optional(),
});

export type ClassifiedItem = z.infer<typeof classifiedItemSchema>;

export const classifiedBatchResponseSchema = z.object({
  classified: z.array(classifiedItemSchema),
});

export const ingestBatchPayloadSchema = z.object({
  jobId: z.string().uuid().optional(),
  fileName: z.string().min(1),
  totalRows: z.number().int().positive(),
  batchIndex: z.number().int().nonnegative(),
  rows: z.array(
    z.object({
      question: z.string().min(1),
      answer: z.string().optional(),
      topic: z.string().optional(),
      difficulty: z.string().optional(),
    })
  ).min(1).max(25),
});

export type IngestBatchPayload = z.infer<typeof ingestBatchPayloadSchema>;
