"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { getPostAuthRedirectPath } from "@/lib/post-auth-redirect";
import { getSiteUrl } from "@/lib/site-url";
import {
  forgotPasswordSchema,
  onboardingSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";
import { enrollPlayerInSeason } from "@/lib/enroll-player-season";
import { canAutoEnrollInSeason, getActiveSeason } from "@/lib/season";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Sign in or use Forgot password.";
  }
  return message;
}

async function redirectAfterAuth(userId: string): Promise<never> {
  const supabase = await createClient();
  const path = await getPostAuthRedirectPath(supabase, userId);
  redirect(path);
}

export async function signInWithPassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: formatAuthError(error.message) };
  if (!data.user) return { error: "Sign in failed. Please try again." };

  await ensureProfile(data.user);
  return redirectAfterAuth(data.user.id);
}

export async function signUpWithPassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: formatAuthError(error.message) };
  if (!data.user) return { error: "Sign up failed. Please try again." };

  await ensureProfile(data.user);
  return redirectAfterAuth(data.user.id);
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid email" };
  }

  const siteUrl = getSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
  });

  if (error) return { error: error.message };
  return {
    success:
      "If an account exists for that email, we sent a link to reset your password.",
  };
}

export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Session expired. Request a new reset link from Forgot password." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  return redirectAfterAuth(user.id);
}

export async function completeOnboarding(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = onboardingSchema.safeParse({
    teamName: formData.get("teamName"),
    eaId: formData.get("eaId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      team_name: parsed.data.teamName,
      ea_id: parsed.data.eaId,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  const season = await getActiveSeason();
  if (season && canAutoEnrollInSeason(season)) {
    const { error: enrollError } = await enrollPlayerInSeason(supabase, {
      profileId: user.id,
      teamName: parsed.data.teamName,
      seasonId: season.id,
    });
    if (enrollError) return { error: enrollError };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
