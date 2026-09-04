"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/lib/notification-prefs";

const CATEGORY_KEYS = new Set(NOTIFICATION_CATEGORIES.map((c) => c.key));

export async function updateNotificationPrefs(
  prefs: Partial<Record<NotificationCategory, boolean>>
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const clean: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(prefs)) {
    if (CATEGORY_KEYS.has(k as NotificationCategory) && typeof v === "boolean") {
      clean[k] = v;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: clean })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: "Preferences saved." };
}

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: sub.userAgent ?? null,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) return { error: error.message };
  return {};
}

export async function deletePushSubscription(
  endpoint: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { error: error.message };
  return {};
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/dashboard");
}
