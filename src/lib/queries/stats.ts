import { createClient } from "@/lib/supabase/server";

export async function getTeamStats(seasonId: string, teamId: string) {
  const supabase = await createClient();

  const { data: matchweekIds } = await supabase
    .from("matchweeks")
    .select("id")
    .eq("season_id", seasonId);

  if (!matchweekIds?.length) {
    return { goalsFor: 0, goalsAgainst: 0, cleanSheets: 0, maxGoals: 30 };
  }

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("home_team_id, away_team_id, home_score, away_score")
    .in("matchweek_id", matchweekIds.map((m) => m.id))
    .eq("status", "completed");

  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;

  for (const f of fixtures ?? []) {
    if (f.home_score === null || f.away_score === null) continue;
    const isHome = f.home_team_id === teamId;
    const isAway = f.away_team_id === teamId;
    if (!isHome && !isAway) continue;

    const scored = isHome ? f.home_score : f.away_score;
    const conceded = isHome ? f.away_score : f.home_score;
    goalsFor += scored;
    goalsAgainst += conceded;
    if (conceded === 0) cleanSheets++;
  }

  return {
    goalsFor,
    goalsAgainst,
    cleanSheets,
    maxGoals: Math.max(goalsFor, 30),
  };
}

export async function getRecentForm(
  seasonId: string,
  teamId: string,
  limit = 5
): Promise<("W" | "D" | "L")[]> {
  const supabase = await createClient();

  const { data: matchweekIds } = await supabase
    .from("matchweeks")
    .select("id")
    .eq("season_id", seasonId);

  if (!matchweekIds?.length) return [];

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("home_team_id, away_team_id, home_score, away_score, updated_at")
    .in("matchweek_id", matchweekIds.map((m) => m.id))
    .eq("status", "completed")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("updated_at", { ascending: false })
    .limit(limit);

  const form: ("W" | "D" | "L")[] = [];

  for (const f of fixtures ?? []) {
    if (f.home_score === null || f.away_score === null) continue;
    const isHome = f.home_team_id === teamId;
    const scored = isHome ? f.home_score : f.away_score;
    const conceded = isHome ? f.away_score : f.home_score;
    if (scored > conceded) form.push("W");
    else if (scored === conceded) form.push("D");
    else form.push("L");
  }

  return form;
}
