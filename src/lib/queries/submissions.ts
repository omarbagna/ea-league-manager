import { createClient } from "@/lib/supabase/server";
import { getFixtureById } from "@/lib/queries/fixtures";
import { teamNameForProfile } from "@/lib/queries/disputes";
import { getSubmissionScreenshotUrl } from "@/lib/queries/submission-screenshot";
import type { MatchSubmission } from "@/types/database";

export type PendingSubmissionForAdmin = {
  submission: MatchSubmission;
  homeName: string;
  awayName: string;
  homeEaId?: string | null;
  awayEaId?: string | null;
  matchweekNumber?: number | null;
  submitterName: string;
  opponentName: string;
  screenshotUrl: string | null;
};

export async function getPendingSubmissionsForAdmin(): Promise<
  PendingSubmissionForAdmin[]
> {
  const supabase = await createClient();

  const { data: subs } = await supabase
    .from("match_submissions")
    .select("*")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false });

  const items = await Promise.all(
    (subs ?? []).map(async (sub) => {
      const fixture = await getFixtureById(sub.fixture_id);
      if (!fixture) return null;

      const submitterName = teamNameForProfile(fixture, sub.submitted_by);
      const opponentProfileId =
        sub.submitted_by === fixture.home_team.profile_id
          ? fixture.away_team.profile_id
          : fixture.home_team.profile_id;
      const opponentName = opponentProfileId
        ? teamNameForProfile(fixture, opponentProfileId)
        : "Unknown";

      const screenshotUrl = await getSubmissionScreenshotUrl(sub.screenshot_path);

      return {
        submission: sub,
        homeName: fixture.home_team.name,
        awayName: fixture.away_team.name,
        homeEaId: fixture.home_team.profile?.ea_id,
        awayEaId: fixture.away_team.profile?.ea_id,
        matchweekNumber: (fixture.matchweek as { number?: number })?.number,
        submitterName,
        opponentName,
        screenshotUrl,
      };
    })
  );

  return items.filter((item) => item != null);
}

export async function getFixturePendingSubmissions(
  fixtureId: string
): Promise<MatchSubmission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_submissions")
    .select("*")
    .eq("fixture_id", fixtureId)
    .eq("status", "pending_approval");
  return data ?? [];
}

export async function getPendingApprovalForUser(userId: string) {
  const supabase = await createClient();

  const { data: subs } = await supabase
    .from("match_submissions")
    .select("*")
    .eq("status", "pending_approval")
    .neq("submitted_by", userId)
    .order("created_at", { ascending: false });

  for (const sub of subs ?? []) {
    const fixture = await getFixtureById(sub.fixture_id);
    if (!fixture) continue;

    const isOpponent =
      fixture.home_team.profile_id === userId ||
      fixture.away_team.profile_id === userId;

    if (isOpponent) {
      return { submission: sub, fixture };
    }
  }

  return null;
}

export async function getMyPendingSubmissionForUser(userId: string) {
  const supabase = await createClient();

  const { data: subs } = await supabase
    .from("match_submissions")
    .select("*")
    .eq("status", "pending_approval")
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false });

  for (const sub of subs ?? []) {
    const fixture = await getFixtureById(sub.fixture_id);
    if (!fixture) continue;

    const isParticipant =
      fixture.home_team.profile_id === userId ||
      fixture.away_team.profile_id === userId;

    if (isParticipant) {
      return { submission: sub, fixture };
    }
  }

  return null;
}

const REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type RevertableSubmission = {
  submissionId: string;
  fixtureId: string;
  approvedAt: string;
  expiresAt: string;
  homeScore: number;
  awayScore: number;
};

export async function getRevertableSubmissionsByFixtureIds(
  fixtureIds: string[]
): Promise<Map<string, RevertableSubmission>> {
  const result = new Map<string, RevertableSubmission>();
  if (fixtureIds.length === 0) return result;

  const supabase = await createClient();
  const cutoff = new Date(Date.now() - REVERT_WINDOW_MS).toISOString();

  const { data: subs } = await supabase
    .from("match_submissions")
    .select("id, fixture_id, home_score, away_score, approved_at")
    .in("fixture_id", fixtureIds)
    .eq("status", "approved")
    .not("approved_at", "is", null)
    .gte("approved_at", cutoff);

  if (!subs?.length) return result;

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id, status, home_score, away_score, forfeited_team_id")
    .in("id", fixtureIds);

  const fixtureById = new Map((fixtures ?? []).map((f) => [f.id, f]));

  for (const sub of subs) {
    const fixture = fixtureById.get(sub.fixture_id);
    if (!fixture) continue;
    if (fixture.status !== "completed") continue;
    if (fixture.forfeited_team_id) continue;
    if (
      fixture.home_score !== sub.home_score ||
      fixture.away_score !== sub.away_score
    ) {
      continue;
    }
    if (!sub.approved_at) continue;

    const approvedAt = sub.approved_at;
    const expiresAt = new Date(
      new Date(approvedAt).getTime() + REVERT_WINDOW_MS
    ).toISOString();

    result.set(sub.fixture_id, {
      submissionId: sub.id,
      fixtureId: sub.fixture_id,
      approvedAt,
      expiresAt,
      homeScore: sub.home_score,
      awayScore: sub.away_score,
    });
  }

  return result;
}
