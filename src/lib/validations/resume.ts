import { z } from "zod";

export const atsRequestSchema = z.object({
  resumeId: z.string().uuid("Valid resumeId is required"),
  roleId: z.string().uuid("Please select a target role"),
});

export type AtsRequestInput = z.infer<typeof atsRequestSchema>;

export const atsReportSchema = z.object({
  overall_score: z.number().min(0).max(100),
  section_scores: z.object({
    skills: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    education: z.number().min(0).max(100),
    formatting: z.number().min(0).max(100),
    keywords: z.number().min(0).max(100),
  }),
  matched_keywords: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  suggestions: z.array(z.string()).min(1).max(10),
});

export type AtsReport = z.infer<typeof atsReportSchema>;
