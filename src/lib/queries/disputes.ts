import { createClient } from "@/lib/supabase/server";
import { getFixtureById } from "@/lib/queries/fixtures";
import type { FixtureWithTeams } from "@/types/database";
import type { MatchSubmission } from "@/types/database";

export type MatchDisputeRow = {
  id: string;
  submission_id: string;
  raised_by: string;
  reason: string | null;
  resolution: string;
  counter_home_score: number | null;
  counter_away_score: number | null;
  counter_screenshot_path: string | null;
  created_at: string;
};

export type ActiveDisputeContext = {
  dispute: MatchDisputeRow;
  submission: MatchSubmission;
  fixture: FixtureWithTeams;
  /** Profile id of the player who submitted the original score */
  submitterProfileId: string;
  /** Profile id of the player who disputed with a counter score */
  disputerProfileId: string;
};

export async function getActiveDisputeForUser(
  userId: string
): Promise<ActiveDisputeContext | null> {
  const supabase = await createClient();

  const { data: disputes } = await supabase
    .from("match_disputes")
    .select("*")
    .eq("resolution", "pending")
    .order("created_at", { ascending: false });

  for (const dispute of disputes ?? []) {
    const { data: submission } = await supabase
      .from("match_submissions")
      .select("*")
      .eq("id", dispute.submission_id)
      .eq("status", "disputed")
      .maybeSingle();

    if (!submission) continue;

    const fixture = await getFixtureById(submission.fixture_id);
    if (!fixture) continue;

    const isParticipant =
      fixture.home_team.profile_id === userId ||
      fixture.away_team.profile_id === userId;

    if (!isParticipant) continue;

    return {
      dispute: dispute as MatchDisputeRow,
      submission,
      fixture,
      submitterProfileId: submission.submitted_by,
      disputerProfileId: dispute.raised_by,
    };
  }

  return null;
}

export function teamNameForProfile(
  fixture: FixtureWithTeams,
  profileId: string
): string {
  if (fixture.home_team.profile_id === profileId) return fixture.home_team.name;
  if (fixture.away_team.profile_id === profileId) return fixture.away_team.name;
  return "Unknown";
}
