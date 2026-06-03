import { createServiceClient } from "@/lib/supabase/server";
import { isScreenshotAvailable } from "@/lib/screenshots";

const BUCKET = "match-evidence";

async function removeEvidenceFile(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  path: string
): Promise<{ error?: string }> {
  const { error } = await service.storage.from(BUCKET).remove([path]);
  if (error) return { error: error.message };
  return {};
}

/** Removes evidence files via Storage API and marks DB paths as purged. */
export async function purgeSubmissionScreenshot(
  submissionId: string
): Promise<{ error?: string }> {
  const service = await createServiceClient();

  const { data: submission } = await service
    .from("match_submissions")
    .select("screenshot_path")
    .eq("id", submissionId)
    .single();

  if (submission?.screenshot_path && isScreenshotAvailable(submission.screenshot_path)) {
    const { error } = await removeEvidenceFile(service, submission.screenshot_path);
    if (error) return { error };
  }

  await service
    .from("match_submissions")
    .update({
      screenshot_path: "purged",
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  const { data: disputes } = await service
    .from("match_disputes")
    .select("id, counter_screenshot_path")
    .eq("submission_id", submissionId);

  for (const dispute of disputes ?? []) {
    const counterPath = dispute.counter_screenshot_path;
    if (counterPath && isScreenshotAvailable(counterPath)) {
      const { error } = await removeEvidenceFile(service, counterPath);
      if (error) return { error };
    }

    await service
      .from("match_disputes")
      .update({ counter_screenshot_path: "purged" })
      .eq("id", dispute.id);
  }

  return {};
}
