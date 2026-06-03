import { createClient } from "@/lib/supabase/server";
import { getFixtureById } from "@/lib/queries/fixtures";
import type { MatchSubmission } from "@/types/database";

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
