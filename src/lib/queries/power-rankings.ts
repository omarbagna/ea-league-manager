import { createClient } from "@/lib/supabase/server";
import { getStandings } from "@/lib/standings";

/**
 * A lightweight Elo-style power rating, computed purely from this season's
 * results. It is a simplified heuristic (a fixed K-factor, no home-field
 * term — there is no real "home" in an online league) meant to surface form
 * the points table can't show yet, not a rigorous forecasting model.
 */
const BASE_RATING = 1500;
const K_FACTOR = 28;
/** Draw likelihood shrinks as the rating gap between two teams grows. */
const BASE_DRAW_PROB = 0.26;
const MIN_DRAW_PROB = 0.1;

export type EloRow = {
  rank: number;
  teamId: string;
  teamName: string;
  crestSeed: string | null;
  crestUrl: string | null;
  rating: number;
  played: number;
  /** change vs the end of the previous matchweek; null when there's no prior snapshot */
  delta: number | null;
  /** last up to 8 post-match ratings, oldest → newest, for a sparkline */
  history: number[];
};

export type ProjectedRow = {
  teamId: string;
  teamName: string;
  crestSeed: string | null;
  crestUrl: string | null;
  currentPosition: number;
  currentPoints: number;
  played: number;
  remaining: number;
  expectedPoints: number;
  projectedPoints: number;
  projectedPosition: number;
  /** currentPosition - projectedPosition; positive means projected to climb */
  positionDelta: number;
};

export type PowerRankings = {
  season: { id: string; name: string };
  asOfMatchweek: number | null;
  totalTeams: number;
  ratings: EloRow[];
  projected: ProjectedRow[];
  remainingFixtures: number;
};

type RawFixture = {
  matchweek_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  updated_at: string | null;
};

function expectedScore(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

function movMultiplier(goalDiff: number): number {
  return 1 + Math.min(Math.max(goalDiff - 1, 0), 3) * 0.25;
}

/** Win / draw / loss probabilities for `a` at home to `b`, from current ratings. */
function matchProbabilities(
  a: number,
  b: number
): { winA: number; draw: number; winB: number } {
  const d = a - b;
  const rawExpA = expectedScore(a, b);
  const draw = Math.max(
    MIN_DRAW_PROB,
    BASE_DRAW_PROB - Math.abs(d) / 2500
  );
  let winA = rawExpA - draw / 2;
  winA = Math.min(Math.max(winA, 0), 1 - draw);
  const winB = 1 - winA - draw;
  return { winA, draw, winB };
}

export async function getPowerRankings(
  seasonId: string
): Promise<PowerRankings | null> {
  const supabase = await createClient();

  const [{ data: season }, standings, { data: matchweeks }] = await Promise.all(
    [
      supabase.from("seasons").select("id, name").eq("id", seasonId).maybeSingle(),
      getStandings(seasonId),
      supabase
        .from("matchweeks")
        .select("id, number")
        .eq("season_id", seasonId)
        .order("number"),
    ]
  );

  if (!season) return null;

  const mwNumberById = new Map(
    (matchweeks ?? []).map((m) => [m.id, m.number as number])
  );
  const mwIds = (matchweeks ?? []).map((m) => m.id);

  const { data: rawFixtures } = mwIds.length
    ? await supabase
        .from("fixtures")
        .select(
          "matchweek_id, home_team_id, away_team_id, home_score, away_score, status, updated_at"
        )
        .in("matchweek_id", mwIds)
    : { data: [] };

  const all = (rawFixtures ?? []) as RawFixture[];

  const completed = all
    .filter(
      (f) =>
        f.status === "completed" &&
        f.home_score !== null &&
        f.away_score !== null
    )
    .sort(
      (a, b) =>
        (mwNumberById.get(a.matchweek_id) ?? 0) -
          (mwNumberById.get(b.matchweek_id) ?? 0) ||
        new Date(a.updated_at ?? 0).getTime() -
          new Date(b.updated_at ?? 0).getTime()
    );

  const remaining = all.filter(
    (f) => f.status === "scheduled" || f.status === "in_progress"
  );

  const teamMeta = new Map(
    standings.map((s) => [
      s.team_id,
      {
        name: s.team?.name ?? "—",
        crestSeed: s.team?.crest_seed ?? null,
        crestUrl: s.team?.crest_url ?? null,
      },
    ])
  );

  // --- Elo simulation over the season's completed results ---
  const ratings = new Map<string, number>();
  const played = new Map<string, number>();
  const historyByTeam = new Map<string, number[]>();
  const snapshots = new Map<number, Map<string, number>>();

  const ratingOf = (id: string) => ratings.get(id) ?? BASE_RATING;

  let currentMw: number | null = null;
  for (const f of completed) {
    const mwNo = mwNumberById.get(f.matchweek_id) ?? 0;
    if (currentMw !== null && mwNo !== currentMw) {
      snapshots.set(currentMw, new Map(ratings));
    }
    currentMw = mwNo;

    const homeR = ratingOf(f.home_team_id);
    const awayR = ratingOf(f.away_team_id);
    const hs = f.home_score as number;
    const as = f.away_score as number;
    const expHome = expectedScore(homeR, awayR);
    const scoreHome = hs > as ? 1 : hs === as ? 0.5 : 0;
    const mult = movMultiplier(Math.abs(hs - as));
    const delta = K_FACTOR * mult * (scoreHome - expHome);

    const newHome = homeR + delta;
    const newAway = awayR - delta;
    ratings.set(f.home_team_id, newHome);
    ratings.set(f.away_team_id, newAway);
    played.set(f.home_team_id, (played.get(f.home_team_id) ?? 0) + 1);
    played.set(f.away_team_id, (played.get(f.away_team_id) ?? 0) + 1);

    for (const [id, r] of [
      [f.home_team_id, newHome],
      [f.away_team_id, newAway],
    ] as const) {
      const arr = historyByTeam.get(id) ?? [];
      arr.push(Math.round(r));
      if (arr.length > 8) arr.shift();
      historyByTeam.set(id, arr);
    }
  }
  if (currentMw !== null) snapshots.set(currentMw, new Map(ratings));

  const prevSnapshotMw = [...snapshots.keys()]
    .filter((k) => currentMw !== null && k < currentMw)
    .sort((a, b) => b - a)[0];
  const prevSnapshot = prevSnapshotMw !== undefined ? snapshots.get(prevSnapshotMw) : undefined;

  const eloRows = standings
    .map((s) => {
      const rating = ratingOf(s.team_id);
      const prevRating = prevSnapshot?.get(s.team_id);
      const meta = teamMeta.get(s.team_id);
      return {
        teamId: s.team_id,
        teamName: meta?.name ?? "—",
        crestSeed: meta?.crestSeed ?? null,
        crestUrl: meta?.crestUrl ?? null,
        rating: Math.round(rating),
        played: played.get(s.team_id) ?? 0,
        delta:
          prevRating !== undefined
            ? Math.round(rating) - Math.round(prevRating)
            : null,
        history: historyByTeam.get(s.team_id) ?? [],
      };
    })
    .sort((a, b) => b.rating - a.rating)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  // --- Projected final table: current points + expected points from Elo ---
  const expectedPointsByTeam = new Map<string, number>();
  const remainingByTeam = new Map<string, number>();
  const bump = (id: string, pts: number) => {
    expectedPointsByTeam.set(id, (expectedPointsByTeam.get(id) ?? 0) + pts);
    remainingByTeam.set(id, (remainingByTeam.get(id) ?? 0) + 1);
  };
  for (const f of remaining) {
    const homeR = ratingOf(f.home_team_id);
    const awayR = ratingOf(f.away_team_id);
    const { winA, draw, winB } = matchProbabilities(homeR, awayR);
    bump(f.home_team_id, 3 * winA + draw);
    bump(f.away_team_id, 3 * winB + draw);
  }

  const projectedRows = standings
    .map((s, i) => {
      const meta = teamMeta.get(s.team_id);
      const xp = expectedPointsByTeam.get(s.team_id) ?? 0;
      return {
        teamId: s.team_id,
        teamName: meta?.name ?? "—",
        crestSeed: meta?.crestSeed ?? null,
        crestUrl: meta?.crestUrl ?? null,
        currentPosition: i + 1,
        currentPoints: s.points,
        currentGoalDiff: s.goal_difference,
        currentGoalsFor: s.goals_for,
        played: s.played,
        remaining: remainingByTeam.get(s.team_id) ?? 0,
        expectedPoints: Math.round(xp * 10) / 10,
        projectedPoints: Math.round((s.points + xp) * 10) / 10,
      };
    })
    .sort(
      (a, b) =>
        b.projectedPoints - a.projectedPoints ||
        b.currentGoalDiff - a.currentGoalDiff ||
        b.currentGoalsFor - a.currentGoalsFor
    )
    .map((row, i) => ({
      ...row,
      projectedPosition: i + 1,
      positionDelta: row.currentPosition - (i + 1),
    }));

  return {
    season: { id: season.id, name: season.name },
    asOfMatchweek: currentMw,
    totalTeams: standings.length,
    ratings: eloRows,
    projected: projectedRows,
    remainingFixtures: remaining.length,
  };
}
