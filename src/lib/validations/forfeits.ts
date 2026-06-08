import { z } from "zod";

export const forfeitReportSchema = z.object({
  fixtureId: z.string().uuid(),
  screenshotPath: z.string().optional(),
  notes: z.string().max(500).optional(),
});
