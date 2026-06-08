"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { purgeSubmissionScreenshot } from "@/lib/purge-submission-screenshot";
import { purgeForfeitScreenshot } from "@/lib/purge-forfeit-screenshot";
import { enrollPlayerInSeason } from "@/lib/enroll-player-season";
import { getActiveSeason } from "@/lib/season";
import {
  buildMatchweekSchedule,
  getWeekendRange,
  parseAnchorDate,
  seasonEndDateAfterLastMatchweek,
} from "@/lib/scheduling/double-round-robin";
import { z } from "zod";

export type AdminActionState = { error?: string; success?: string };

const seasonSchema = z.object({
  name: z.string().min(2),
  startsAt: z.string().optional(),
});

export async function createSeasonForm(formData: FormData) {
  await createSeason({}, formData);
}

export async function createSeason(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const parsed = seasonSchema.safeParse({
    name: formData.get("name"),
    startsAt: formData.get("startsAt") || undefined,
  });
  if (!parsed.success) return { error: "Invalid season data" };

  const supabase = await createClient();
  const { error } = await supabase.from("seasons").insert({
    name: parsed.data.name,
    status: "draft",
    starts_at: parsed.data.startsAt ?? null,
    ends_at: null,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/seasons");
  return { success: "Season created." };
}

export async function updateSeason(
  seasonId: string,
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("status")
    .eq("id", seasonId)
    .single();

  if (!season) return { error: "Season not found." };
  if (season.status !== "draft") {
    return { error: "Only draft seasons can be edited." };
  }

  const parsed = seasonSchema.safeParse({
    name: formData.get("name"),
    startsAt: formData.get("startsAt") || undefined,
  });
  if (!parsed.success) return { error: "Invalid season data" };

  const { error } = await supabase
    .from("seasons")
    .update({
      name: parsed.data.name,
      starts_at: parsed.data.startsAt ?? null,
    })
    .eq("id", seasonId);

  if (error) return { error: error.message };
  revalidatePath("/admin/seasons");
  revalidatePath("/admin/fixtures");
  return { success: "Season updated." };
}

export async function activateSeason(seasonId: string): Promise<AdminActionState> {
  const supabase = await createClient();

  await supabase
    .from("seasons")
    .update({ status: "draft" })
    .eq("status", "active");

  const { error } = await supabase
    .from("seasons")
    .update({ status: "active" })
    .eq("id", seasonId);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/seasons");
  return { success: "Season activated." };
}

export async function createMatchweek(
  seasonId: string,
  number: number,
  startsAt?: string,
  endsAt?: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("matchweeks").insert({
    season_id: seasonId,
    number,
    starts_at: startsAt ?? null,
    ends_at: endsAt ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/fixtures");
  return { success: `Matchweek ${number} created.` };
}

export async function generateSeasonSchedule(
  seasonId: string,
  startDate?: string
): Promise<AdminActionState> {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("starts_at")
    .eq("id", seasonId)
    .single();

  if (!season) return { error: "Season not found." };

  const { count: matchweekCount } = await supabase
    .from("matchweeks")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId);

  if (matchweekCount && matchweekCount > 0) {
    return { error: "Schedule already exists for this season." };
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("season_id", seasonId);

  if (!teams || teams.length < 2) {
    return { error: "Need at least 2 teams" };
  }

  const teamIds = teams.map((t) => t.id);
  const { matchweeks, roundsPerWeek } = buildMatchweekSchedule(teamIds);
  const anchor = parseAnchorDate(startDate ?? season.starts_at);

  const matchweekRows = matchweeks.map((_, index) => {
    const { startsAt, endsAt } = getWeekendRange(anchor, index);
    return {
      season_id: seasonId,
      number: index + 1,
      starts_at: startsAt,
      ends_at: endsAt,
    };
  });

  const { data: insertedWeeks, error: mwError } = await supabase
    .from("matchweeks")
    .insert(matchweekRows)
    .select("id, number");

  if (mwError || !insertedWeeks) {
    return { error: mwError?.message ?? "Failed to create matchweeks" };
  }

  const weekByNumber = new Map(insertedWeeks.map((w) => [w.number, w.id]));
  const fixtures: {
    matchweek_id: string;
    home_team_id: string;
    away_team_id: string;
    status: string;
    kickoff_at: null;
  }[] = [];

  matchweeks.forEach((weekFixtures, weekIndex) => {
    const matchweekId = weekByNumber.get(weekIndex + 1);
    if (!matchweekId) return;
    for (const f of weekFixtures) {
      fixtures.push({
        matchweek_id: matchweekId,
        home_team_id: f.homeId,
        away_team_id: f.awayId,
        status: "scheduled",
        kickoff_at: null,
      });
    }
  });

  const { error: fixtureError } = await supabase.from("fixtures").insert(fixtures);
  if (fixtureError) return { error: fixtureError.message };

  const lastWeek = matchweekRows[matchweekRows.length - 1];
  if (lastWeek?.ends_at) {
    const seasonEndsAt = seasonEndDateAfterLastMatchweek(lastWeek.ends_at);
    const { error: seasonEndError } = await supabase
      .from("seasons")
      .update({ ends_at: seasonEndsAt })
      .eq("id", seasonId);

    if (seasonEndError) return { error: seasonEndError.message };
  }

  revalidatePath("/admin/fixtures");
  revalidatePath("/admin/seasons");
  return {
    success: `Generated ${fixtures.length} fixtures across ${matchweeks.length} matchweeks (${roundsPerWeek} scheduling round${roundsPerWeek === 1 ? "" : "s"} per week). Season end date set automatically.`,
  };
}

export async function resolveDispute(
  disputeId: string,
  resolution: "approved" | "rejected" | "override",
  overrideHome?: number,
  overrideAway?: number,
  adminNotes?: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: dispute } = await supabase
    .from("match_disputes")
    .select("*, submission:match_submissions(*)")
    .eq("id", disputeId)
    .single();

  if (!dispute) return { error: "Dispute not found" };

  const submission = dispute.submission as {
    id: string;
    fixture_id: string;
    home_score: number;
    away_score: number;
    submitted_by: string;
    screenshot_path: string;
  };

  await supabase
    .from("match_disputes")
    .update({
      resolution,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      admin_notes: adminNotes ?? null,
      override_home_score: overrideHome ?? null,
      override_away_score: overrideAway ?? null,
    })
    .eq("id", disputeId);

  if (resolution === "approved") {
    const service = await createServiceClient();
    const { error: approveError } = await service.rpc("approve_match_submission", {
      p_submission_id: submission.id,
    });
    if (approveError) return { error: approveError.message };

    const { error: purgeError } = await purgeSubmissionScreenshot(submission.id);
    if (purgeError) return { error: purgeError };
  } else if (resolution === "override" && overrideHome != null && overrideAway != null) {
    await supabase
      .from("match_submissions")
      .update({
        home_score: overrideHome,
        away_score: overrideAway,
        status: "approved",
      })
      .eq("id", submission.id);

    await supabase
      .from("fixtures")
      .update({
        home_score: overrideHome,
        away_score: overrideAway,
        status: "completed",
      })
      .eq("id", submission.fixture_id);

    const { data: mw } = await supabase
      .from("fixtures")
      .select("matchweek_id")
      .eq("id", submission.fixture_id)
      .single();

    let seasonId: string | undefined;
    if (mw?.matchweek_id) {
      const { data: matchweek } = await supabase
        .from("matchweeks")
        .select("season_id")
        .eq("id", mw.matchweek_id)
        .single();
      seasonId = matchweek?.season_id;
    }
    if (seasonId) {
      const service = await createServiceClient();
      await service.rpc("recalculate_standings", { p_season_id: seasonId });
    }

    const { error: purgeError } = await purgeSubmissionScreenshot(submission.id);
    if (purgeError) return { error: purgeError };
  } else {
    await supabase
      .from("match_submissions")
      .update({ status: "rejected" })
      .eq("id", submission.id);
  }

  revalidatePath("/admin/disputes");
  revalidatePath("/dashboard");
  return { success: "Dispute resolved." };
}

export async function adminApproveSubmission(
  submissionId: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Forbidden" };

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

  const service = await createServiceClient();
  const { error: approveError } = await service.rpc("approve_match_submission", {
    p_submission_id: submissionId,
  });
  if (approveError) return { error: approveError.message };

  const { error: purgeError } = await purgeSubmissionScreenshot(submissionId);
  if (purgeError) return { error: purgeError };

  await notifyUser(
    sub.submitted_by,
    "result_approved",
    "Result Approved",
    "An admin reviewed and approved your match result.",
    { submissionId, fixtureId: sub.fixture_id }
  );

  if (opponentProfile) {
    await notifyUser(
      opponentProfile,
      "result_approved",
      "Match Result Finalized",
      "An admin approved the submitted match result for your fixture.",
      { submissionId, fixtureId: sub.fixture_id }
    );
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  revalidatePath("/matches/report");
  revalidatePath("/fixtures");
  revalidatePath("/standings");
  revalidatePath("/dashboard");
  return { success: "Report approved." };
}

async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  payload: Record<string, unknown> = {}
) {
  const service = await createServiceClient();
  await service.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    payload,
  });
}

export async function approveForfeitReport(
  reportId: string,
  adminNotes?: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Forbidden" };

  const { data: report } = await supabase
    .from("forfeit_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report || report.status !== "pending") {
    return { error: "Report not found or already processed" };
  }

  await supabase
    .from("forfeit_reports")
    .update({
      resolved_by: user.id,
      admin_notes: adminNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  const service = await createServiceClient();
  const { error: approveError } = await service.rpc("approve_forfeit_report", {
    p_report_id: reportId,
  });
  if (approveError) return { error: approveError.message };

  const { error: purgeError } = await purgeForfeitScreenshot(reportId);
  if (purgeError) return { error: purgeError };

  const { getFixtureById } = await import("@/lib/queries/fixtures");
  const fixture = await getFixtureById(report.fixture_id);
  const opponentProfile =
    fixture &&
    (report.reported_by === fixture.home_team.profile_id
      ? fixture.away_team.profile_id
      : fixture.home_team.profile_id);

  await notifyUser(
    report.reported_by,
    "forfeit_approved",
    "No-Show Approved",
    "Your no-show report was approved. The match is recorded as a 3–0 forfeit win.",
    { reportId, fixtureId: report.fixture_id }
  );

  if (opponentProfile) {
    await notifyUser(
      opponentProfile,
      "forfeit_approved",
      "Match Forfeited",
      "An admin approved a no-show report against you. The match is recorded as 3–0 against you.",
      { reportId, fixtureId: report.fixture_id }
    );
  }

  revalidatePath("/admin/forfeits");
  revalidatePath("/admin");
  revalidatePath("/matches/report");
  revalidatePath("/fixtures");
  revalidatePath("/dashboard");
  revalidatePath("/standings");
  return { success: "Forfeit approved." };
}

export async function rejectForfeitReport(
  reportId: string,
  adminNotes?: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Forbidden" };

  const { data: report } = await supabase
    .from("forfeit_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report || report.status !== "pending") {
    return { error: "Report not found or already processed" };
  }

  const { error } = await supabase
    .from("forfeit_reports")
    .update({
      status: "rejected",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      admin_notes: adminNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) return { error: error.message };

  await notifyUser(
    report.reported_by,
    "forfeit_rejected",
    "No-Show Report Rejected",
    "Your no-show report was rejected. You may submit a normal score report or file again with better evidence.",
    { reportId, fixtureId: report.fixture_id }
  );

  revalidatePath("/admin/forfeits");
  revalidatePath("/admin");
  revalidatePath("/matches/report");
  revalidatePath("/fixtures");
  revalidatePath("/dashboard");
  return { success: "Forfeit report rejected." };
}

const adminForfeitSchema = z.object({
  fixtureId: z.string().uuid(),
  absentTeamId: z.string().uuid(),
  adminNotes: z.string().max(500).optional(),
});

export async function adminMarkFixtureForfeit(
  fixtureId: string,
  absentTeamId: string,
  adminNotes?: string
): Promise<AdminActionState> {
  const parsed = adminForfeitSchema.safeParse({
    fixtureId,
    absentTeamId,
    adminNotes: adminNotes || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid forfeit data" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Forbidden" };

  const { data: pendingSubmissions } = await supabase
    .from("match_submissions")
    .select("id")
    .eq("fixture_id", parsed.data.fixtureId)
    .in("status", ["pending_approval", "disputed"]);

  const { data: pendingReports } = await supabase
    .from("forfeit_reports")
    .select("id")
    .eq("fixture_id", parsed.data.fixtureId)
    .eq("status", "pending");

  const service = await createServiceClient();
  const { error: forfeitError } = await service.rpc("admin_forfeit_fixture", {
    p_fixture_id: parsed.data.fixtureId,
    p_absent_team_id: parsed.data.absentTeamId,
    p_admin_id: user.id,
    p_admin_notes: parsed.data.adminNotes ?? null,
  });
  if (forfeitError) return { error: forfeitError.message };

  for (const sub of pendingSubmissions ?? []) {
    const { error: purgeError } = await purgeSubmissionScreenshot(sub.id);
    if (purgeError) return { error: purgeError };
  }

  for (const report of pendingReports ?? []) {
    const { error: purgeError } = await purgeForfeitScreenshot(report.id);
    if (purgeError) return { error: purgeError };
  }

  const { getFixtureById } = await import("@/lib/queries/fixtures");
  const fixture = await getFixtureById(parsed.data.fixtureId);
  if (fixture) {
    const winnerProfileId =
      parsed.data.absentTeamId === fixture.home_team_id
        ? fixture.away_team.profile_id
        : fixture.home_team.profile_id;
    const loserProfileId =
      parsed.data.absentTeamId === fixture.home_team_id
        ? fixture.home_team.profile_id
        : fixture.away_team.profile_id;

    if (winnerProfileId) {
      await notifyUser(
        winnerProfileId,
        "forfeit_admin",
        "No-Show Forfeit Recorded",
        "An admin recorded a no-show forfeit. The match is finalized 3–0 in your favor.",
        { fixtureId: parsed.data.fixtureId }
      );
    }
    if (loserProfileId) {
      await notifyUser(
        loserProfileId,
        "forfeit_admin",
        "Match Forfeited",
        "An admin recorded you as no-show. The match is finalized 3–0 against you.",
        { fixtureId: parsed.data.fixtureId }
      );
    }
  }

  revalidatePath("/admin/fixtures");
  revalidatePath("/admin/forfeits");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/disputes");
  revalidatePath("/admin");
  revalidatePath("/matches/report");
  revalidatePath("/fixtures");
  revalidatePath("/dashboard");
  revalidatePath("/standings");
  return { success: "Forfeit recorded." };
}

export async function enrollPlayerInActiveSeason(
  profileId: string
): Promise<AdminActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (adminProfile?.role !== "admin") return { error: "Forbidden" };

  const season = await getActiveSeason();
  if (!season) return { error: "Activate a season before enrolling members." };

  const { data: member } = await supabase
    .from("profiles")
    .select("id, team_name, onboarding_complete, is_banned")
    .eq("id", profileId)
    .single();

  if (!member) return { error: "User not found." };
  if (member.is_banned) return { error: "Banned users cannot be enrolled." };
  if (!member.team_name?.trim()) {
    return { error: "User has no team name on their profile." };
  }

  const service = await createServiceClient();
  const { error: enrollError } = await enrollPlayerInSeason(service, {
    profileId: member.id,
    teamName: member.team_name.trim(),
    seasonId: season.id,
  });
  if (enrollError) return { error: enrollError };

  revalidatePath("/admin/teams");
  revalidatePath("/admin/fixtures");
  return { success: `${member.team_name} enrolled in ${season.name}.` };
}

export async function enrollPlayerInActiveSeasonForm(formData: FormData): Promise<void> {
  const profileId = formData.get("profileId");
  if (typeof profileId !== "string" || !profileId) {
    redirect("/admin/teams?error=Invalid+user");
  }
  const result = await enrollPlayerInActiveSeason(profileId);
  if (result.error) {
    redirect(`/admin/teams?error=${encodeURIComponent(result.error)}`);
  }
  redirect(
    `/admin/teams?success=${encodeURIComponent(result.success ?? "User enrolled.")}`
  );
}

export async function promoteToAdmin(profileId: string): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", profileId);

  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { success: "User promoted to admin." };
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");
  return { user, profile };
}
