import { createClient } from "@/lib/supabase/server";
import type { StandingRow, Team } from "@/types/database";

export type MatchResult = "W" | "D" | "L";

/**
 * League zones for a single-table season. Boundaries are intentionally simple
 * constants so an admin can tune them later without touching the table UI.
 */
export type LeagueZone = "champion" | "promotion" | "relegation";

const PROMOTION_THROUGH = 4; // positions 2..4
const RELEGATION_COUNT = 3; // last N positions
const RELEGATION_MIN_TEAMS = 8; // don't show a drop zone in a tiny league

export function zoneForPosition(
  position: number,
  totalTeams: number
): LeagueZone | null {
  if (position === 1) return "champion";
  if (position <= PROMOTION_THROUGH) return "promotion";
  if (
    totalTeams >= RELEGATION_MIN_TEAMS &&
    position > totalTeams - RELEGATION_COUNT
  ) {
    return "relegation";
  }
  return null;
}

type Tally = { points: number; gd: number; gf: number };

function rankTallies(tallies: Map<string, Tally>): Map<string, number> {
  const ordered = [...tallies.entries()].sort(([, a], [, b]) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
  return new Map(ordered.map(([teamId], i) => [teamId, i + 1]));
}

async function getSeasonMatchweeks(seasonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matchweeks")
    .select("id, number")
    .eq("season_id", seasonId)
    .order("number");
  return data ?? [];
}

async function getCompletedFixtures(matchweekIds: string[]) {
  if (!matchweekIds.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("fixtures")
    .select(
      "matchweek_id, home_team_id, away_team_id, home_score, away_score, updated_at, status"
    )
    .in("matchweek_id", matchweekIds)
    .eq("status", "completed");
  return (data ?? []).filter(
    (f) => f.home_score !== null && f.away_score !== null
  );
}

/**
 * Position of each team as the table stood at the end of the *previous*
 * completed matchweek. Used to show ▲/▼ movement against the live table.
 * Returns an empty map when there is no prior week to compare to.
 */
export async function getPreviousPositions(
  seasonId: string
): Promise<Map<string, number>> {
  const matchweeks = await getSeasonMatchweeks(seasonId);
  if (matchweeks.length < 2) return new Map();

  const numberByMwId = new Map(matchweeks.map((m) => [m.id, m.number]));
  const fixtures = await getCompletedFixtures(matchweeks.map((m) => m.id));
  if (!fixtures.length) return new Map();

  const latestCompleted = Math.max(
    ...fixtures.map((f) => numberByMwId.get(f.matchweek_id) ?? 0)
  );
  const cutoff = latestCompleted - 1;
  if (cutoff < 1) return new Map();

  const tallies = new Map<string, Tally>();
  const bump = (teamId: string, gf: number, ga: number) => {
    const t = tallies.get(teamId) ?? { points: 0, gd: 0, gf: 0 };
    t.gf += gf;
    t.gd += gf - ga;
    if (gf > ga) t.points += 3;
    else if (gf === ga) t.points += 1;
    tallies.set(teamId, t);
  };

  for (const f of fixtures) {
    if ((numberByMwId.get(f.matchweek_id) ?? 0) > cutoff) continue;
    bump(f.home_team_id, f.home_score as number, f.away_score as number);
    bump(f.away_team_id, f.away_score as number, f.home_score as number);
  }

  return rankTallies(tallies);
}

/**
 * Last-five form per team, oldest → newest, keyed by team id.
 */
export async function getFormByTeam(
  seasonId: string
): Promise<Map<string, MatchResult[]>> {
  const matchweeks = await getSeasonMatchweeks(seasonId);
  const fixtures = await getCompletedFixtures(matchweeks.map((m) => m.id));
  if (!fixtures.length) return new Map();

  fixtures.sort(
    (a, b) =>
      new Date(a.updated_at ?? 0).getTime() -
      new Date(b.updated_at ?? 0).getTime()
  );

  const form = new Map<string, MatchResult[]>();
  const push = (teamId: string, result: MatchResult) => {
    const arr = form.get(teamId) ?? [];
    arr.push(result);
    if (arr.length > 5) arr.shift();
    form.set(teamId, arr);
  };

  for (const f of fixtures) {
    const h = f.home_score as number;
    const a = f.away_score as number;
    push(f.home_team_id, h > a ? "W" : h === a ? "D" : "L");
    push(f.away_team_id, a > h ? "W" : a === h ? "D" : "L");
  }

  return form;
}

/** Points from a form string — used to rank "in form" teams. */
export function formPoints(form: MatchResult[] | undefined): number {
  if (!form) return 0;
  return form.reduce((n, r) => n + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
}

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
