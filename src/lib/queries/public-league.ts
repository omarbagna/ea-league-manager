import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { formatWeekendRange } from "@/lib/format-weekend";
import type { StandingRow, Team } from "@/types/database";

/**
 * Data for the public, unauthenticated /league page. Every table this
 * touches (seasons, teams, matchweeks, fixtures, standings) is RLS-locked
 * to `authenticated` — rather than opening any of that up to `anon` at the
 * database level, this reads through the service client (server-only, the
 * key never reaches the browser) and hand-picks only what's safe to show
 * a stranger: team names, crests, scores. No profiles, no emails, nothing
 * from the reporting/dispute pipeline.
 */

export type PublicTeam = {
  id: string;
  name: string;
  crestSeed: string | null;
  crestUrl: string | null;
};

export type PublicFixture = {
  id: string;
  matchweekNumber: number;
  weekend: string | null;
  home: PublicTeam;
  away: PublicTeam;
  homeScore: number | null;
  awayScore: number | null;
  forfeit: boolean;
};

export type PublicLeader = {
  label: string;
  team: PublicTeam;
  value: string;
};

export type PublicLeagueSnapshot = {
  season: { id: string; name: string; isArchived: boolean } | null;
  standings: StandingRow[];
  totalTeams: number;
  champion: StandingRow | null;
  leaders: PublicLeader[];
  recentResults: PublicFixture[];
  upcomingFixtures: PublicFixture[];
};

const EMPTY_TEAM: PublicTeam = { id: "", name: "—", crestSeed: null, crestUrl: null };

function teamVM(team: Team | undefined): PublicTeam {
  if (!team) return EMPTY_TEAM;
  return {
    id: team.id,
    name: team.name,
    crestSeed: team.crest_seed,
    crestUrl: team.crest_url,
  };
}

export async function getPublicLeagueSnapshot(): Promise<PublicLeagueSnapshot> {
  const supabase = await createServiceClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  let season = activeSeason;
  let isArchived = false;
  if (!season) {
    const { data: completed } = await supabase
      .from("seasons")
      .select("*")
      .eq("status", "completed")
      .order("ends_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    season = completed;
    isArchived = true;
  }

  if (!season) {
    return {
      season: null,
      standings: [],
      totalTeams: 0,
      champion: null,
      leaders: [],
      recentResults: [],
      upcomingFixtures: [],
    };
  }

  const [{ data: teams }, { data: standingsRaw }, { data: matchweeks }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name, crest_seed, crest_url")
        .eq("season_id", season.id),
      supabase
        .from("standings")
        .select("*")
        .eq("season_id", season.id)
        .order("points", { ascending: false })
        .order("goal_difference", { ascending: false })
        .order("goals_for", { ascending: false }),
      supabase
        .from("matchweeks")
        .select("id, number, starts_at, ends_at")
        .eq("season_id", season.id)
        .order("number"),
    ]);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t as Team]));
  const standings: StandingRow[] = (standingsRaw ?? []).map((s) => ({
    ...s,
    team: teamMap.get(s.team_id),
  }));

  const played = standings.filter((s) => s.played > 0);
  const topScorer = [...played].sort((a, b) => b.goals_for - a.goals_for)[0];
  const bestDefense = [...played].sort(
    (a, b) => a.goals_against / a.played - b.goals_against / b.played
  )[0];
  const mostWins = [...played].sort((a, b) => b.won - a.won)[0];

  const leaders: PublicLeader[] = [];
  if (topScorer) {
    leaders.push({
      label: "Top scorer",
      team: teamVM(topScorer.team),
      value: `${topScorer.goals_for} goals`,
    });
  }
  if (bestDefense) {
    leaders.push({
      label: "Meanest defence",
      team: teamVM(bestDefense.team),
      value: `${bestDefense.goals_against} conceded`,
    });
  }
  if (mostWins) {
    leaders.push({
      label: "Most wins",
      team: teamVM(mostWins.team),
      value: `${mostWins.won} wins`,
    });
  }

  const mwMap = new Map((matchweeks ?? []).map((m) => [m.id, m]));
  const mwIds = (matchweeks ?? []).map((m) => m.id);
  const { data: fixtures } = mwIds.length
    ? await supabase
        .from("fixtures")
        .select(
          "id, matchweek_id, home_team_id, away_team_id, home_score, away_score, status, forfeited_team_id, updated_at"
        )
        .in("matchweek_id", mwIds)
    : { data: [] };

  const buildFixtureVM = (f: NonNullable<typeof fixtures>[number]): PublicFixture => {
    const mw = mwMap.get(f.matchweek_id);
    return {
      id: f.id,
      matchweekNumber: mw?.number ?? 0,
      weekend: formatWeekendRange(mw?.starts_at, mw?.ends_at),
      home: teamVM(teamMap.get(f.home_team_id)),
      away: teamVM(teamMap.get(f.away_team_id)),
      homeScore: f.home_score,
      awayScore: f.away_score,
      forfeit: !!f.forfeited_team_id,
    };
  };

  const recentResults = (fixtures ?? [])
    .filter((f) => f.status === "completed")
    .sort(
      (a, b) =>
        (mwMap.get(b.matchweek_id)?.number ?? 0) -
          (mwMap.get(a.matchweek_id)?.number ?? 0) ||
        new Date(b.updated_at ?? 0).getTime() -
          new Date(a.updated_at ?? 0).getTime()
    )
    .slice(0, 6)
    .map(buildFixtureVM);

  const upcomingFixtures = isArchived
    ? []
    : (fixtures ?? [])
        .filter((f) => f.status === "scheduled" || f.status === "in_progress")
        .sort(
          (a, b) =>
            (mwMap.get(a.matchweek_id)?.number ?? 0) -
            (mwMap.get(b.matchweek_id)?.number ?? 0)
        )
        .slice(0, 6)
        .map(buildFixtureVM);

  return {
    season: { id: season.id, name: season.name, isArchived },
    standings,
    totalTeams: standings.length,
    champion: isArchived ? (standings[0] ?? null) : null,
    leaders,
    recentResults,
    upcomingFixtures,
  };
}
