import { createClient } from "@/lib/supabase/server";
import { getFixtureById } from "@/lib/queries/fixtures";
import {
  evaluateForfeitEligibility,
  forfeitScoresForReporter,
  type ForfeitEligibility,
} from "@/lib/forfeit-eligibility";
import type { FixtureWithTeams, ForfeitReport } from "@/types/database";

export type PendingForfeitContext = {
  report: ForfeitReport;
  fixture: FixtureWithTeams;
  reporterTeamId: string;
  absentTeamName: string;
  previewScore: { homeScore: number; awayScore: number };
};

export async function getForfeitEligibility(
  fixtureId: string,
  userId: string
): Promise<ForfeitEligibility & { fixture: FixtureWithTeams | null }> {
  const fixture = await getFixtureById(fixtureId);
  if (!fixture) {
    return { eligible: false, reason: "fixture_completed", fixture: null };
  }

  const supabase = await createClient();

  const { data: blockingSubmission } = await supabase
    .from("match_submissions")
    .select("id")
    .eq("fixture_id", fixtureId)
    .in("status", ["pending_approval", "disputed"])
    .maybeSingle();

  const { data: pendingForfeit } = await supabase
    .from("forfeit_reports")
    .select("id")
    .eq("fixture_id", fixtureId)
    .eq("status", "pending")
    .maybeSingle();

  const endsAt = (fixture.matchweek as { ends_at?: string | null })?.ends_at;

  const result = evaluateForfeitEligibility({
    fixtureStatus: fixture.status,
    matchweekEndsAt: endsAt,
    userProfileId: userId,
    homeProfileId: fixture.home_team.profile_id,
    awayProfileId: fixture.away_team.profile_id,
    hasBlockingSubmission: !!blockingSubmission,
    hasPendingForfeit: !!pendingForfeit,
  });

  return { ...result, fixture };
}

export async function getMyPendingForfeitForUser(
  userId: string,
  fixtureId?: string
): Promise<PendingForfeitContext | null> {
  const supabase = await createClient();

  let query = supabase
    .from("forfeit_reports")
    .select("*")
    .eq("reported_by", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (fixtureId) {
    query = query.eq("fixture_id", fixtureId);
  }

  const { data: reports } = await query.limit(1);
  const report = reports?.[0] as ForfeitReport | undefined;
  if (!report) return null;

  const fixture = await getFixtureById(report.fixture_id);
  if (!fixture) return null;

  const reporterTeamId =
    fixture.home_team.profile_id === userId
      ? fixture.home_team_id
      : fixture.away_team_id;

  const absentTeamName =
    report.absent_team_id === fixture.home_team_id
      ? fixture.home_team.name
      : fixture.away_team.name;

  const previewScore = forfeitScoresForReporter(
    fixture.home_team_id,
    fixture.away_team_id,
    reporterTeamId
  );

  return {
    report,
    fixture,
    reporterTeamId,
    absentTeamName,
    previewScore,
  };
}

export type AdminForfeitItem = {
  report: ForfeitReport;
  fixture: FixtureWithTeams;
  reporterTeamName: string;
  absentTeamName: string;
  previewScore: { homeScore: number; awayScore: number };
  screenshotUrl: string | null;
};

export async function getPendingForfeitReportsForAdmin(): Promise<AdminForfeitItem[]> {
  const supabase = await createClient();
  const { getSubmissionScreenshotUrl } = await import(
    "@/lib/queries/submission-screenshot"
  );

  const { data: reports } = await supabase
    .from("forfeit_reports")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const items: AdminForfeitItem[] = [];

  for (const report of (reports ?? []) as ForfeitReport[]) {
    const fixture = await getFixtureById(report.fixture_id);
    if (!fixture) continue;

    const reporterTeamId =
      fixture.home_team.profile_id === report.reported_by
        ? fixture.home_team_id
        : fixture.away_team_id;

    const reporterTeamName =
      reporterTeamId === fixture.home_team_id
        ? fixture.home_team.name
        : fixture.away_team.name;

    const absentTeamName =
      report.absent_team_id === fixture.home_team_id
        ? fixture.home_team.name
        : fixture.away_team.name;

    const previewScore = forfeitScoresForReporter(
      fixture.home_team_id,
      fixture.away_team_id,
      reporterTeamId
    );

    const screenshotUrl = await getSubmissionScreenshotUrl(report.screenshot_path);

    items.push({
      report,
      fixture,
      reporterTeamName,
      absentTeamName,
      previewScore,
      screenshotUrl,
    });
  }

  return items;
}
