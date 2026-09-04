import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { isTypeEnabled } from "@/lib/notification-prefs";
import { sendPushToUser } from "@/lib/push";

function deepLink(payload: Record<string, unknown>): string | undefined {
  const fixtureId = payload.fixtureId ?? payload.fixture_id;
  return typeof fixtureId === "string"
    ? `/matches/report?fixtureId=${fixtureId}`
    : undefined;
}

/** Insert an in-app notification (honouring the recipient's preferences) and
 *  fire a Web Push if they have a subscription. */
export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", userId)
    .maybeSingle();

  if (!isTypeEnabled(profile?.notification_prefs, type)) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    payload,
  });

  await sendPushToUser(userId, { title, body, url: deepLink(payload) });
}

export async function notifyAdmins(
  type: string,
  title: string,
  body: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createServiceClient();
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  for (const admin of admins ?? []) {
    await notifyUser(admin.id, type, title, body, payload);
  }
}
