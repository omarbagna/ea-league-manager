import { createClient } from "@/lib/supabase/server";
import { getStandings, getSeasonProgress } from "@/lib/standings";
import { formatWeekendRange } from "@/lib/format-weekend";
import type { MatchResult } from "@/lib/standings";
import type { StandingRow } from "@/types/database";

export type TeamFixtureVM = {
  id: string;
  matchweekNumber: number;
  weekend: string | null;
  isHome: boolean;
  opponent: {
    id: string;
    name: string;
    crestSeed: string | null;
    crestUrl: string | null;
  };
  status: string;
  teamScore: number | null;
  oppScore: number | null;
  forfeited: boolean;
  result: MatchResult | null;
};

export type TeamProfile = {
  team: {
    id: string;
    name: string;
    crestSeed: string | null;
    crestUrl: string | null;
    disqualifiedAt: string | null;
  };
  season: { id: string; name: string; status: string };
  manager: { eaId: string | null; teamName: string | null } | null;
  position: number | null;
  totalTeams: number;
  standing: StandingRow | null;
  form: MatchResult[];
  progress: { matchweek: number; points: number }[];
  fixtures: TeamFixtureVM[];
};

function resultFor(
  teamScore: number | null,
  oppScore: number | null
): MatchResult | null {
  if (teamScore === null || oppScore === null) return null;
  if (teamScore > oppScore) return "W";
  if (teamScore === oppScore) return "D";
  return "L";
}

export async function getTeamProfile(
  teamId: string
): Promise<TeamProfile | null> {
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, crest_seed, crest_url, season_id, profile_id, disqualified_at")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) return null;

  const [{ data: season }, { data: profile }, standings] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, status")
      .eq("id", team.season_id)
      .maybeSingle(),
    team.profile_id
      ? supabase
          .from("profiles")
          .select("ea_id, team_name")
          .eq("id", team.profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getStandings(team.season_id),
  ]);

  if (!season) return null;

  const idx = standings.findIndex((s) => s.team_id === teamId);
  const standing = idx >= 0 ? standings[idx] : null;

  const { data: matchweeks } = await supabase
    .from("matchweeks")
    .select("id, number, starts_at, ends_at")
    .eq("season_id", team.season_id)
    .order("number");

  const mwById = new Map((matchweeks ?? []).map((m) => [m.id, m]));
  const mwIds = (matchweeks ?? []).map((m) => m.id);

  const { data: rawFixtures } = mwIds.length
    ? await supabase
        .from("fixtures")
        .select(
          "id, matchweek_id, home_team_id, away_team_id, home_score, away_score, status, forfeited_team_id, updated_at"
        )
        .in("matchweek_id", mwIds)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    : { data: [] };

  const oppIds = [
    ...new Set(
      (rawFixtures ?? []).map((f) =>
        f.home_team_id === teamId ? f.away_team_id : f.home_team_id
      )
    ),
  ];
  const { data: oppTeams } = oppIds.length
    ? await supabase
        .from("teams")
        .select("id, name, crest_seed, crest_url")
        .in("id", oppIds)
    : { data: [] };
  const oppById = new Map((oppTeams ?? []).map((t) => [t.id, t]));

  const fixtures: TeamFixtureVM[] = (rawFixtures ?? [])
    .map((f) => {
      const mw = mwById.get(f.matchweek_id);
      const isHome = f.home_team_id === teamId;
      const oppId = isHome ? f.away_team_id : f.home_team_id;
      const opp = oppById.get(oppId);
      const teamScore = isHome ? f.home_score : f.away_score;
      const oppScore = isHome ? f.away_score : f.home_score;
      return {
        id: f.id,
        matchweekNumber: mw?.number ?? 0,
        weekend: formatWeekendRange(mw?.starts_at, mw?.ends_at),
        isHome,
        opponent: {
          id: oppId,
          name: opp?.name ?? "—",
          crestSeed: opp?.crest_seed ?? null,
          crestUrl: opp?.crest_url ?? null,
        },
        status: f.status,
        teamScore: f.status === "completed" ? teamScore : null,
        oppScore: f.status === "completed" ? oppScore : null,
        forfeited: !!f.forfeited_team_id,
        result:
          f.status === "completed" ? resultFor(teamScore, oppScore) : null,
      };
    })
    .sort((a, b) => a.matchweekNumber - b.matchweekNumber);

  const form: MatchResult[] = fixtures
    .filter((f) => f.result)
    .slice(-5)
    .map((f) => f.result as MatchResult);

  const progress = await getSeasonProgress(team.season_id, teamId);

  return {
    team: {
      id: team.id,
      name: team.name,
      crestSeed: team.crest_seed,
      crestUrl: team.crest_url,
      disqualifiedAt: team.disqualified_at,
    },
    season: { id: season.id, name: season.name, status: season.status },
    manager: profile
      ? { eaId: profile.ea_id, teamName: profile.team_name }
      : null,
    position: idx >= 0 ? idx + 1 : null,
    totalTeams: standings.length,
    standing,
    form,
    progress,
    fixtures,
  };
}

export type HeadToHead = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  meetings: TeamFixtureVM[];
};

/** Head-to-head for `viewerTeamId` against the profiled team, from its fixture list. */
export function headToHead(
  fixtures: TeamFixtureVM[],
  viewerTeamId: string
): HeadToHead {
  const meetings = fixtures.filter((f) => f.opponent.id === viewerTeamId);
  const h: HeadToHead = {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    meetings,
  };
  for (const m of meetings) {
    if (m.teamScore === null || m.oppScore === null) continue;
    // flip perspective to the viewer
    const vFor = m.oppScore;
    const vAgainst = m.teamScore;
    h.played++;
    h.goalsFor += vFor;
    h.goalsAgainst += vAgainst;
    if (vFor > vAgainst) h.won++;
    else if (vFor === vAgainst) h.drawn++;
    else h.lost++;
  }
  return h;
}
