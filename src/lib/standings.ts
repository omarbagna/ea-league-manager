import { createClient } from "@/lib/supabase/server";
import type { StandingRow, Team } from "@/types/database";

export async function getStandings(seasonId: string): Promise<StandingRow[]> {
  const supabase = await createClient();
  const { data: standings } = await supabase
    .from("standings")
    .select("*")
    .eq("season_id", seasonId)
    .order("points", { ascending: false })
    .order("goal_difference", { ascending: false })
    .order("goals_for", { ascending: false });

  if (!standings?.length) return [];

  const teamIds = standings.map((s) => s.team_id);
  const { data: teams } = await supabase.from("teams").select("*").in("id", teamIds);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t as Team]));

  return standings.map((s) => ({
    ...s,
    team: teamMap.get(s.team_id),
  }));
}

export async function getSeasonProgress(
  seasonId: string,
  teamId: string
): Promise<{ matchweek: number; points: number }[]> {
  const supabase = await createClient();

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("id, number")
    .eq("season_id", seasonId)
    .order("number");

  if (!matchweeks?.length) return [];

  const results: { matchweek: number; points: number }[] = [];
  let cumulative = 0;

  for (const mw of matchweeks) {
    const { data: fixtures } = await supabase
      .from("fixtures")
      .select("home_team_id, away_team_id, home_score, away_score, status")
      .eq("matchweek_id", mw.id)
      .eq("status", "completed");

    let weekPoints = 0;
    for (const f of fixtures ?? []) {
      if (f.home_score === null || f.away_score === null) continue;
      const isHome = f.home_team_id === teamId;
      const isAway = f.away_team_id === teamId;
      if (!isHome && !isAway) continue;

      const scored = isHome ? f.home_score : f.away_score;
      const conceded = isHome ? f.away_score : f.home_score;
      if (scored > conceded) weekPoints += 3;
      else if (scored === conceded) weekPoints += 1;
    }
    cumulative += weekPoints;
    results.push({ matchweek: mw.number, points: cumulative });
  }

  return results;
}
