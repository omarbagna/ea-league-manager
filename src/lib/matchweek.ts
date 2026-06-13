import { createClient } from "@/lib/supabase/server";
import { todayUtcDateString } from "@/lib/forfeit-eligibility";
import type { Matchweek } from "@/types/database";

/** Active = today (UTC) falls within [starts_at, ends_at] inclusive. */
export function isMatchweekActive(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined
): boolean {
  if (!startsAt || !endsAt) return false;
  const today = todayUtcDateString();
  return today >= startsAt && today <= endsAt;
}

export async function getActiveMatchweek(
  seasonId: string,
  teamId?: string | null
): Promise<Matchweek | null> {
  const supabase = await createClient();

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("*")
    .eq("season_id", seasonId)
    .order("number");

  if (!matchweeks?.length) return null;

  const calendarActive = matchweeks.find((mw) =>
    isMatchweekActive(mw.starts_at, mw.ends_at)
  );
  if (calendarActive) return calendarActive;

  if (!teamId) return null;

  for (const mw of matchweeks) {
    const { data: fixture } = await supabase
      .from("fixtures")
      .select("id")
      .eq("matchweek_id", mw.id)
      .neq("status", "completed")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .limit(1)
      .maybeSingle();

    if (fixture) return mw;
  }

  return null;
}
