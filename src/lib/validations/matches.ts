import { z } from "zod";

export const scoreSubmissionSchema = z.object({
  fixtureId: z.string().uuid(),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  screenshotPath: z.string().min(1, "Screenshot is required"),
});

export const disputeSchema = z.object({
  submissionId: z.string().uuid(),
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
  screenshotPath: z.string().min(1, "Screenshot is required"),
  reason: z.string().max(500).optional(),
});
