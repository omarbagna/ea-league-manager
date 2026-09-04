"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/actions/admin";
import type { AdminActionState } from "@/actions/admin";

async function updateProfile(
  profileId: string,
  patch: Record<string, unknown>
): Promise<AdminActionState> {
  const { user } = await requireAdmin();
  if (profileId === user.id) {
    return { error: "You can't change your own account here." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profileId);

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { success: "Done." };
}

export async function setUserRole(
  profileId: string,
  role: "admin" | "player"
): Promise<AdminActionState> {
  return updateProfile(profileId, { role });
}

export async function setUserBanned(
  profileId: string,
  banned: boolean
): Promise<AdminActionState> {
  return updateProfile(profileId, { is_banned: banned });
}

/** Legacy form-action wrapper (kept for any existing callers). */
export async function promoteUserAction(formData: FormData) {
  const profileId = formData.get("profileId") as string;
  if (!profileId) return;
  await setUserRole(profileId, "admin");
}
