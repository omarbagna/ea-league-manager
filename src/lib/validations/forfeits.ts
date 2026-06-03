import { z } from "zod";

export const forfeitReportSchema = z.object({
  fixtureId: z.string().uuid(),
  screenshotPath: z.string().min(1, "Screenshot is required"),
  notes: z.string().max(500).optional(),
});
