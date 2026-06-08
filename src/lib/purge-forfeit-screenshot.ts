import { createServiceClient } from "@/lib/supabase/server";
import { isScreenshotAvailable } from "@/lib/screenshots";

const BUCKET = "match-evidence";

export async function purgeForfeitScreenshot(
  reportId: string
): Promise<{ error?: string }> {
  const service = await createServiceClient();

  const { data: report } = await service
    .from("forfeit_reports")
    .select("screenshot_path")
    .eq("id", reportId)
    .single();

  if (report?.screenshot_path && isScreenshotAvailable(report.screenshot_path)) {
    const { error } = await service.storage
      .from(BUCKET)
      .remove([report.screenshot_path]);
    if (error) return { error: error.message };

    await service
      .from("forfeit_reports")
      .update({
        screenshot_path: "purged",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);
  }

  return {};
}
