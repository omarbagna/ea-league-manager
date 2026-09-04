import { createClient } from "@/lib/supabase/server";
import { getFixtureById } from "@/lib/queries/fixtures";
import { teamNameForProfile } from "@/lib/queries/disputes";
import { getStandings, getFormByTeam } from "@/lib/standings";
import { formatWeekendRange } from "@/lib/format-weekend";
import type { MatchResult } from "@/lib/standings";
import type { FixtureStatus, StandingRow } from "@/types/database";

export type RecentResult = {
  fixtureId: string;
  matchweekNumber: number;
  opponentId: string;
  opponentName: string;
  isHome: boolean;
  teamScore: number;
  oppScore: number;
  result: MatchResult;
  forfeit: boolean;
};

export type MatchCentreTeam = {
  id: string;
  name: string;
  crestSeed: string | null;
  crestUrl: string | null;
  eaId: string | null;
  disqualifiedAt: string | null;
  position: number | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** last five, oldest → newest */
  form: MatchResult[];
  /** last five completed, newest → oldest */
  recent: RecentResult[];
};

export type H2HMeeting = {
  fixtureId: string;
  matchweekNumber: number;
  status: FixtureStatus;
  homeTeamId: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  forfeit: boolean;
  isCurrent: boolean;
};

export type MatchCentre = {
  fixture: {
    id: string;
    status: FixtureStatus;
    homeScore: number | null;
    awayScore: number | null;
    forfeitedTeamId: string | null;
    forfeitedTeamName: string | null;
  };
  season: { id: string; name: string };
  matchweek: {
    number: number;
    weekend: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  home: MatchCentreTeam;
  away: MatchCentreTeam;
  totalTeams: number;
  participants: { homeProfileId: string | null; awayProfileId: string | null };
  h2h: {
    meetings: H2HMeeting[];
    homeWins: number;
    awayWins: number;
    draws: number;
    homeGoals: number;
    awayGoals: number;
  };
  /** Best-effort — null when the viewer can't read the fixture's submissions. */
  result: { reportedByName: string | null; approvedAt: string | null } | null;
};

type RawFixture = {
  id: string;
  matchweek_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: FixtureStatus;
  forfeited_team_id: string | null;
  updated_at: string | null;
};

function outcome(scored: number, conceded: number): MatchResult {
  if (scored > conceded) return "W";
  if (scored === conceded) return "D";
  return "L";
}

function buildTeam(
  teamRef: {
    id: string;
    name: string;
    crest_seed: string | null;
    crest_url: string | null;
    profile_id: string | null;
    disqualified_at: string | null;
    profile?: { ea_id?: string | null } | null;
  },
  standings: StandingRow[],
  form: Map<string, MatchResult[]>,
  allFixtures: RawFixture[],
  currentFixtureId: string,
  mwNumberById: Map<string, number>,
  nameById: Map<string, string>
): MatchCentreTeam {
  const idx = standings.findIndex((s) => s.team_id === teamRef.id);
  const row = idx >= 0 ? standings[idx] : null;

  const recent: RecentResult[] = allFixtures
    .filter(
      (f) =>
        f.id !== currentFixtureId &&
        f.status === "completed" &&
        f.home_score !== null &&
        f.away_score !== null &&
        (f.home_team_id === teamRef.id || f.away_team_id === teamRef.id)
    )
    .sort(
      (a, b) =>
        (mwNumberById.get(b.matchweek_id) ?? 0) -
          (mwNumberById.get(a.matchweek_id) ?? 0) ||
        new Date(b.updated_at ?? 0).getTime() -
          new Date(a.updated_at ?? 0).getTime()
    )
    .slice(0, 5)
    .map((f) => {
      const isHome = f.home_team_id === teamRef.id;
      const oppId = isHome ? f.away_team_id : f.home_team_id;
      const teamScore = (isHome ? f.home_score : f.away_score) as number;
      const oppScore = (isHome ? f.away_score : f.home_score) as number;
      return {
        fixtureId: f.id,
        matchweekNumber: mwNumberById.get(f.matchweek_id) ?? 0,
        opponentId: oppId,
        opponentName: nameById.get(oppId) ?? "—",
        isHome,
        teamScore,
        oppScore,
        result: outcome(teamScore, oppScore),
        forfeit: !!f.forfeited_team_id,
      };
    });

  return {
    id: teamRef.id,
    name: teamRef.name,
    crestSeed: teamRef.crest_seed,
    crestUrl: teamRef.crest_url,
    eaId: teamRef.profile?.ea_id ?? null,
    disqualifiedAt: teamRef.disqualified_at,
    position: idx >= 0 ? idx + 1 : null,
    played: row?.played ?? 0,
    won: row?.won ?? 0,
    drawn: row?.drawn ?? 0,
    lost: row?.lost ?? 0,
    goalsFor: row?.goals_for ?? 0,
    goalsAgainst: row?.goals_against ?? 0,
    goalDifference: row?.goal_difference ?? 0,
    points: row?.points ?? 0,
    form: form.get(teamRef.id) ?? [],
    recent,
  };
}

export async function getMatchCentre(
  fixtureId: string
): Promise<MatchCentre | null> {
  const fixture = await getFixtureById(fixtureId);
  if (!fixture) return null;

  const mw = fixture.matchweek as
    | {
        number: number;
        season_id?: string;
        starts_at?: string | null;
        ends_at?: string | null;
      }
    | undefined;
  const seasonId = mw?.season_id;
  if (!seasonId) return null;

  const supabase = await createClient();

  const [{ data: season }, standings, form, { data: matchweeks }] =
    await Promise.all([
      supabase.from("seasons").select("id, name").eq("id", seasonId).maybeSingle(),
      getStandings(seasonId),
      getFormByTeam(seasonId),
      supabase
        .from("matchweeks")
        .select("id, number")
        .eq("season_id", seasonId)
        .order("number"),
    ]);

  if (!season) return null;

  const mwNumberById = new Map(
    (matchweeks ?? []).map((m) => [m.id, m.number as number])
  );
  const mwIds = (matchweeks ?? []).map((m) => m.id);

  const homeId = fixture.home_team_id;
  const awayId = fixture.away_team_id;

  const { data: rawFixtures } = mwIds.length
    ? await supabase
        .from("fixtures")
        .select(
          "id, matchweek_id, home_team_id, away_team_id, home_score, away_score, status, forfeited_team_id, updated_at"
        )
        .in("matchweek_id", mwIds)
        .or(
          `home_team_id.in.(${homeId},${awayId}),away_team_id.in.(${homeId},${awayId})`
        )
    : { data: [] };

  const fixtures = (rawFixtures ?? []) as RawFixture[];

  const opponentIds = [
    ...new Set(
      fixtures.flatMap((f) => [f.home_team_id, f.away_team_id])
    ),
  ].filter((id) => id !== homeId && id !== awayId);

  const { data: oppTeams } = opponentIds.length
    ? await supabase
        .from("teams")
        .select("id, name")
        .in("id", opponentIds)
    : { data: [] };

  const nameById = new Map<string, string>([
    [homeId, fixture.home_team.name],
    [awayId, fixture.away_team.name],
    ...(oppTeams ?? []).map((t) => [t.id, t.name] as [string, string]),
  ]);

  const home = buildTeam(
    { ...fixture.home_team, profile: fixture.home_team.profile ?? null },
    standings,
    form,
    fixtures,
    fixture.id,
    mwNumberById,
    nameById
  );
  const away = buildTeam(
    { ...fixture.away_team, profile: fixture.away_team.profile ?? null },
    standings,
    form,
    fixtures,
    fixture.id,
    mwNumberById,
    nameById
  );

  // Head-to-head: every fixture in the season between exactly these two teams.
  const pair = new Set([homeId, awayId]);
  const meetings: H2HMeeting[] = fixtures
    .filter((f) => pair.has(f.home_team_id) && pair.has(f.away_team_id))
    .sort(
      (a, b) =>
        (mwNumberById.get(a.matchweek_id) ?? 0) -
        (mwNumberById.get(b.matchweek_id) ?? 0)
    )
    .map((f) => ({
      fixtureId: f.id,
      matchweekNumber: mwNumberById.get(f.matchweek_id) ?? 0,
      status: f.status,
      homeTeamId: f.home_team_id,
      homeName: nameById.get(f.home_team_id) ?? "—",
      awayName: nameById.get(f.away_team_id) ?? "—",
      homeScore: f.status === "completed" ? f.home_score : null,
      awayScore: f.status === "completed" ? f.away_score : null,
      forfeit: !!f.forfeited_team_id,
      isCurrent: f.id === fixture.id,
    }));

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  for (const m of meetings) {
    if (
      m.isCurrent ||
      m.status !== "completed" ||
      m.homeScore === null ||
      m.awayScore === null
    ) {
      continue;
    }
    // normalise to the profiled fixture's home/away orientation
    const forHome = m.homeTeamId === homeId ? m.homeScore : m.awayScore;
    const forAway = m.homeTeamId === homeId ? m.awayScore : m.homeScore;
    homeGoals += forHome;
    awayGoals += forAway;
    if (forHome > forAway) homeWins++;
    else if (forHome < forAway) awayWins++;
    else draws++;
  }

  const forfeitedTeamName = fixture.forfeited_team_id
    ? fixture.forfeited_team_id === homeId
      ? fixture.home_team.name
      : fixture.forfeited_team_id === awayId
        ? fixture.away_team.name
        : null
    : null;

  let result: MatchCentre["result"] = null;
  if (fixture.status === "completed" && !fixture.forfeited_team_id) {
    const { data: sub } = await supabase
      .from("match_submissions")
      .select("submitted_by, approved_at")
      .eq("fixture_id", fixture.id)
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub) {
      result = {
        reportedByName: sub.submitted_by
          ? teamNameForProfile(fixture, sub.submitted_by)
          : null,
        approvedAt: sub.approved_at,
      };
    }
  }

  return {
    fixture: {
      id: fixture.id,
      status: fixture.status,
      homeScore: fixture.home_score,
      awayScore: fixture.away_score,
      forfeitedTeamId: fixture.forfeited_team_id,
      forfeitedTeamName,
    },
    season: { id: season.id, name: season.name },
    matchweek: {
      number: mw?.number ?? 0,
      weekend: formatWeekendRange(mw?.starts_at, mw?.ends_at),
      startsAt: mw?.starts_at ?? null,
      endsAt: mw?.ends_at ?? null,
    },
    home,
    away,
    totalTeams: standings.length,
    participants: {
      homeProfileId: fixture.home_team.profile_id ?? null,
      awayProfileId: fixture.away_team.profile_id ?? null,
    },
    h2h: { meetings, homeWins, awayWins, draws, homeGoals, awayGoals },
    result,
  };
}
