"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { purgeSubmissionScreenshot } from "@/lib/purge-submission-screenshot";
import { scoreSubmissionSchema, disputeSchema } from "@/lib/validations/matches";
import { forfeitReportSchema } from "@/lib/validations/forfeits";
import { getForfeitEligibility } from "@/lib/queries/forfeits";

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

async function notifyAdmins(
  type: string,
  title: string,
  body: string,
  payload: Record<string, unknown> = {}
) {
  const supabase = await createServiceClient();
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  for (const admin of admins ?? []) {
    await notifyUser(admin.id, type, title, body, payload);
  }
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

  const { data: pendingForfeit } = await supabase
    .from("forfeit_reports")
    .select("id")
    .eq("fixture_id", parsed.data.fixtureId)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingForfeit) {
    return { error: "A no-show report is pending admin review for this fixture." };
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

export async function submitForfeitReport(
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const parsed = forfeitReportSchema.safeParse({
    fixtureId: formData.get("fixtureId"),
    screenshotPath: formData.get("screenshotPath") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid report" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const eligibility = await getForfeitEligibility(parsed.data.fixtureId, user.id);
  if (!eligibility.eligible || !eligibility.fixture) {
    const messages: Record<string, string> = {
      fixture_completed: "This fixture is already completed.",
      matchweek_not_ended: "You can report a no-show after the matchweek weekend ends.",
      not_participant: "You are not a participant in this match.",
      pending_submission: "A score submission is already pending for this fixture.",
      pending_forfeit: "A no-show report is already pending for this fixture.",
      no_matchweek: "This fixture has no matchweek dates.",
    };
    return {
      error: messages[eligibility.reason] ?? "Cannot submit a no-show report for this fixture.",
    };
  }

  const fixture = eligibility.fixture;
  const absentTeamId =
    user.id === fixture.home_team.profile_id
      ? fixture.away_team_id
      : fixture.home_team_id;

  const { data: report, error } = await supabase
    .from("forfeit_reports")
    .insert({
      fixture_id: parsed.data.fixtureId,
      reported_by: user.id,
      absent_team_id: absentTeamId,
      notes: parsed.data.notes ?? null,
      screenshot_path: parsed.data.screenshotPath ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const opponentProfile =
    user.id === fixture.home_team.profile_id
      ? fixture.away_team.profile_id
      : fixture.home_team.profile_id;

  if (opponentProfile) {
    await notifyUser(
      opponentProfile,
      "forfeit_filed",
      "No-Show Report Filed",
      "Your opponent reported that you did not show for your match. An admin will review.",
      { reportId: report.id, fixtureId: parsed.data.fixtureId }
    );
  }

  await notifyAdmins(
    "forfeit_review_required",
    "No-Show Review Required",
    "A player filed a no-show forfeit report.",
    { reportId: report.id, fixtureId: parsed.data.fixtureId }
  );

  revalidatePath("/matches/report");
  revalidatePath("/fixtures");
  revalidatePath("/dashboard");
  revalidatePath("/admin/forfeits");
  revalidatePath("/admin");
  return { success: "No-show report submitted. An admin will review." };
}
