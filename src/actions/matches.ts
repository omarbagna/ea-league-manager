"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { purgeSubmissionScreenshot } from "@/lib/purge-submission-screenshot";
import { scoreSubmissionSchema, disputeSchema } from "@/lib/validations/matches";

export type MatchActionState = { error?: string; success?: string };

async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  payload: Record<string, unknown> = {}
) {
  const supabase = await createServiceClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    payload,
  });
}

export async function submitMatchScore(
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const parsed = scoreSubmissionSchema.safeParse({
    fixtureId: formData.get("fixtureId"),
    homeScore: Number(formData.get("homeScore")),
    awayScore: Number(formData.get("awayScore")),
    screenshotPath: formData.get("screenshotPath"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid submission" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { getFixtureById } = await import("@/lib/queries/fixtures");
  const fixture = await getFixtureById(parsed.data.fixtureId);

  if (!fixture || fixture.status === "completed") {
    return { error: "Fixture not available for reporting" };
  }

  const homeProfile = fixture.home_team.profile_id;
  const awayProfile = fixture.away_team.profile_id;

  if (user.id !== homeProfile && user.id !== awayProfile) {
    return { error: "You are not a participant in this match" };
  }

  const { data: existing } = await supabase
    .from("match_submissions")
    .select("id, status")
    .eq("fixture_id", parsed.data.fixtureId)
    .in("status", ["pending_approval", "disputed"])
    .maybeSingle();

  if (existing) {
    return {
      error:
        existing.status === "disputed"
          ? "This fixture has an open dispute."
          : "A submission is already pending for this fixture",
    };
  }

  const { data: submission, error } = await supabase
    .from("match_submissions")
    .insert({
      fixture_id: parsed.data.fixtureId,
      submitted_by: user.id,
      home_score: parsed.data.homeScore,
      away_score: parsed.data.awayScore,
      screenshot_path: parsed.data.screenshotPath,
      status: "pending_approval",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const opponentId = user.id === homeProfile ? awayProfile : homeProfile;
  if (opponentId) {
    await notifyUser(
      opponentId,
      "approval_required",
      "Pending Your Approval",
      "Your opponent submitted a match result. Please verify.",
      { submissionId: submission.id, fixtureId: parsed.data.fixtureId }
    );
  }

  revalidatePath("/matches/report");
  revalidatePath("/dashboard");
  return { success: "Score submitted. Waiting for opponent approval." };
}

export async function approveSubmission(submissionId: string): Promise<MatchActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: sub } = await supabase
    .from("match_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (!sub || sub.status !== "pending_approval") {
    return { error: "Submission not found or already processed" };
  }

  const { getFixtureById } = await import("@/lib/queries/fixtures");
  const fixture = await getFixtureById(sub.fixture_id);
  if (!fixture) return { error: "Fixture not found" };

  const opponentProfile =
    sub.submitted_by === fixture.home_team.profile_id
      ? fixture.away_team.profile_id
      : fixture.home_team.profile_id;

  if (!opponentProfile || user.id !== opponentProfile) {
    return { error: "Only the opponent can approve this result" };
  }

  const service = await createServiceClient();
  const { error } = await service.rpc("approve_match_submission", {
    p_submission_id: submissionId,
  });

  if (error) return { error: error.message };

  const { error: purgeError } = await purgeSubmissionScreenshot(submissionId);
  if (purgeError) return { error: purgeError };

  await notifyUser(
    sub.submitted_by,
    "result_approved",
    "Result Approved",
    "Your match result has been approved.",
    { submissionId }
  );

  revalidatePath("/dashboard");
  revalidatePath("/fixtures");
  revalidatePath("/standings");
  revalidatePath("/matches/report");
  return { success: "Result approved." };
}

export async function disputeSubmission(
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const parsed = disputeSchema.safeParse({
    submissionId: formData.get("submissionId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    screenshotPath: formData.get("screenshotPath"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid dispute" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: sub } = await supabase
    .from("match_submissions")
    .select("*")
    .eq("id", parsed.data.submissionId)
    .single();

  if (!sub || sub.status !== "pending_approval") {
    return { error: "Submission not available" };
  }

  const { getFixtureById } = await import("@/lib/queries/fixtures");
  const fixture = await getFixtureById(sub.fixture_id);
  if (!fixture) return { error: "Fixture not found" };

  const opponentProfile =
    sub.submitted_by === fixture.home_team.profile_id
      ? fixture.away_team.profile_id
      : fixture.home_team.profile_id;

  if (user.id !== opponentProfile) {
    return { error: "Only the opponent can dispute this result" };
  }

  await supabase
    .from("match_submissions")
    .update({ status: "disputed", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.submissionId);

  await supabase.from("match_disputes").insert({
    submission_id: parsed.data.submissionId,
    raised_by: user.id,
    reason: parsed.data.reason ?? "Disputed by opponent",
    resolution: "pending",
    counter_home_score: parsed.data.homeScore,
    counter_away_score: parsed.data.awayScore,
    counter_screenshot_path: parsed.data.screenshotPath,
  });

  await notifyUser(
    sub.submitted_by,
    "result_disputed",
    "Result Disputed",
    "Your opponent disputed the match result. An admin will review.",
    { submissionId: parsed.data.submissionId }
  );

  revalidatePath("/matches/report");
  revalidatePath("/admin/disputes");
  return { success: "Dispute submitted for admin review." };
}

export async function uploadScreenshot(
  formData: FormData
): Promise<{ path?: string; error?: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("match-evidence")
    .upload(path, file, { upsert: false });

  if (error) return { error: error.message };
  return { path };
}
