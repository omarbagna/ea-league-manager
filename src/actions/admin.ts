"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { purgeSubmissionScreenshot } from "@/lib/purge-submission-screenshot";
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
