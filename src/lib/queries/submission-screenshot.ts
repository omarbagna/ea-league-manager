import { createClient } from "@/lib/supabase/server";
import { isScreenshotAvailable } from "@/lib/screenshots";

export async function getSubmissionScreenshotUrl(
  screenshotPath: string | null | undefined
): Promise<string | null> {
  if (!isScreenshotAvailable(screenshotPath)) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("match-evidence")
    .createSignedUrl(screenshotPath!, 3600);

  return data?.signedUrl ?? null;
}
