import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPostAuthRedirectPath(
  supabase: SupabaseClient,
  userId: string,
  options?: { next?: string }
): Promise<string> {
  const next = options?.next ?? "/dashboard";

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, role")
    .eq("id", userId)
    .single();

  if (!profile?.onboarding_complete) {
    return "/onboarding";
  }
  if (profile.role === "admin" && next === "/dashboard") {
    return "/admin";
  }
  return next;
}
