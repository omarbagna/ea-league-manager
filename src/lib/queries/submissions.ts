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
