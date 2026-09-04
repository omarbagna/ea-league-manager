import { createClient } from "@/lib/supabase/server";
import { getStandings } from "@/lib/standings";

export type LeaderRow = {
  rank: number;
  teamId: string;
  teamName: string;
  crestSeed: string | null;
  crestUrl: string | null;
  value: string;
  /** 0..1 fill for the row bar */
  fill: number;
  sub?: string;
  /** true for the team the viewer manages */
  isViewer?: boolean;
};

export type LeaderBoard = {
  id: string;
  title: string;
  blurb: string;
  rows: LeaderRow[];
};

export type SeasonLeaderboards = {
  season: { id: string; name: string };
  playedFixtures: number;
  boards: LeaderBoard[];
};

type TeamMeta = {
  id: string;
  name: string;
  crestSeed: string | null;
  crestUrl: string | null;
};

type Agg = {
  meta: TeamMeta;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  /** ordered results, oldest → newest */
  seq: ("W" | "D" | "L")[];
  bestWin: { margin: number; label: string } | null;
  bestGame: { goals: number; label: string } | null;
};

function longestRun(
  seq: ("W" | "D" | "L")[],
  keep: (r: "W" | "D" | "L") => boolean
): number {
  let best = 0;
  let cur = 0;
  for (const r of seq) {
    if (keep(r)) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

function currentRun(
  seq: ("W" | "D" | "L")[],
  keep: (r: "W" | "D" | "L") => boolean
): number {
  let cur = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (keep(seq[i])) cur += 1;
    else break;
  }
  return cur;
}

function rankRows(
  entries: { agg: Agg; sortKey: number; value: string; sub?: string }[],
  opts: { limit?: number; viewerTeamId?: string | null } = {}
): LeaderRow[] {
  const limit = opts.limit ?? 5;
  const sorted = [...entries].sort((a, b) => b.sortKey - a.sortKey);
  const top = sorted.slice(0, limit);
  const maxKey = top[0]?.sortKey ?? 0;
  const minKey = Math.min(...top.map((e) => e.sortKey), 0);
  const span = maxKey - minKey || 1;

  const rows: LeaderRow[] = [];
  let lastKey: number | null = null;
  let lastRank = 0;
  top.forEach((e, i) => {
    const rank = e.sortKey === lastKey ? lastRank : i + 1;
    lastKey = e.sortKey;
    lastRank = rank;
    rows.push({
      rank,
      teamId: e.agg.meta.id,
      teamName: e.agg.meta.name,
      crestSeed: e.agg.meta.crestSeed,
      crestUrl: e.agg.meta.crestUrl,
      value: e.value,
      sub: e.sub,
      fill: Math.max(0.08, (e.sortKey - minKey) / span),
      isViewer: !!opts.viewerTeamId && e.agg.meta.id === opts.viewerTeamId,
    });
  });
  return rows;
}

export async function getSeasonLeaderboards(
  seasonId: string,
  viewerTeamId?: string | null
): Promise<SeasonLeaderboards | null> {
  const supabase = await createClient();

  const [{ data: season }, standings, { data: matchweeks }] = await Promise.all([
    supabase.from("seasons").select("id, name").eq("id", seasonId).maybeSingle(),
    getStandings(seasonId),
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

  const { data: rawFixtures } = mwIds.length
    ? await supabase
        .from("fixtures")
        .select(
          "matchweek_id, home_team_id, away_team_id, home_score, away_score, status, updated_at"
        )
        .in("matchweek_id", mwIds)
        .eq("status", "completed")
    : { data: [] };

  const fixtures = (rawFixtures ?? [])
    .filter((f) => f.home_score !== null && f.away_score !== null)
    .sort(
      (a, b) =>
        (mwNumberById.get(a.matchweek_id) ?? 0) -
          (mwNumberById.get(b.matchweek_id) ?? 0) ||
        new Date(a.updated_at ?? 0).getTime() -
          new Date(b.updated_at ?? 0).getTime()
    );

  const nameById = new Map(
    standings.map((s) => [s.team_id, s.team?.name ?? "—"])
  );

  const aggById = new Map<string, Agg>();
  for (const s of standings) {
    aggById.set(s.team_id, {
      meta: {
        id: s.team_id,
        name: s.team?.name ?? "—",
        crestSeed: s.team?.crest_seed ?? null,
        crestUrl: s.team?.crest_url ?? null,
      },
      played: s.played,
      points: s.points,
      goalsFor: s.goals_for,
      goalsAgainst: s.goals_against,
      cleanSheets: 0,
      seq: [],
      bestWin: null,
      bestGame: null,
    });
  }

  for (const f of fixtures) {
    const mwNo = mwNumberById.get(f.matchweek_id) ?? 0;
    const home = aggById.get(f.home_team_id);
    const away = aggById.get(f.away_team_id);
    const hs = f.home_score as number;
    const as = f.away_score as number;

    const sides: [Agg | undefined, number, number, string][] = [
      [home, hs, as, nameById.get(f.away_team_id) ?? "—"],
      [away, as, hs, nameById.get(f.home_team_id) ?? "—"],
    ];

    for (const [agg, gf, ga, oppName] of sides) {
      if (!agg) continue;
      if (ga === 0) agg.cleanSheets += 1;
      agg.seq.push(gf > ga ? "W" : gf === ga ? "D" : "L");

      if (gf > ga) {
        const margin = gf - ga;
        if (!agg.bestWin || margin > agg.bestWin.margin) {
          agg.bestWin = {
            margin,
            label: `${gf}–${ga} v ${oppName} · MW${mwNo}`,
          };
        }
      }
      if (!agg.bestGame || gf > agg.bestGame.goals) {
        agg.bestGame = {
          goals: gf,
          label: `v ${oppName} · MW${mwNo}`,
        };
      }
    }
  }

  const played = [...aggById.values()].filter((a) => a.played > 0);

  const boards: LeaderBoard[] = [];

  boards.push({
    id: "scorers",
    title: "Goals scored",
    blurb: "Total goals for, across the season",
    rows: rankRows(
      played.map((agg) => ({
        agg,
        sortKey: agg.goalsFor,
        value: `${agg.goalsFor}`,
        sub: `${(agg.goalsFor / agg.played).toFixed(2)} per game`,
      })),
      { viewerTeamId }
    ),
  });

  boards.push({
    id: "defence",
    title: "Meanest defence",
    blurb: "Fewest goals conceded — lower is better",
    rows: rankRows(
      played.map((agg) => ({
        agg,
        // invert: fewer conceded ranks higher
        sortKey: -agg.goalsAgainst,
        value: `${agg.goalsAgainst}`,
        sub: `${(agg.goalsAgainst / agg.played).toFixed(2)} per game`,
      })),
      { viewerTeamId }
    ),
  });

  boards.push({
    id: "clean-sheets",
    title: "Clean sheets",
    blurb: "Matches finished without conceding",
    rows: rankRows(
      played
        .filter((a) => a.cleanSheets > 0)
        .map((agg) => ({
          agg,
          sortKey: agg.cleanSheets,
          value: `${agg.cleanSheets}`,
          sub: `${Math.round((agg.cleanSheets / agg.played) * 100)}% of games`,
        })),
      { viewerTeamId }
    ),
  });

  boards.push({
    id: "ppg",
    title: "Points per game",
    blurb: "Season points divided by matches played",
    rows: rankRows(
      played
        .filter((a) => a.played >= 3)
        .map((agg) => ({
          agg,
          sortKey: agg.points / agg.played,
          value: (agg.points / agg.played).toFixed(2),
          sub: `${agg.points} pts / ${agg.played}`,
        })),
      { viewerTeamId }
    ),
  });

  boards.push({
    id: "win-streak",
    title: "Longest win streak",
    blurb: "Most consecutive wins this season",
    rows: rankRows(
      played
        .map((agg) => {
          const best = longestRun(agg.seq, (r) => r === "W");
          const cur = currentRun(agg.seq, (r) => r === "W");
          return {
            agg,
            sortKey: best,
            value: `${best}`,
            sub: best > 0 && cur === best ? "ongoing" : undefined,
          };
        })
        .filter((e) => e.sortKey > 0),
      { viewerTeamId }
    ),
  });

  boards.push({
    id: "unbeaten",
    title: "Longest unbeaten run",
    blurb: "Most consecutive matches without a loss",
    rows: rankRows(
      played
        .map((agg) => {
          const best = longestRun(agg.seq, (r) => r !== "L");
          const cur = currentRun(agg.seq, (r) => r !== "L");
          return {
            agg,
            sortKey: best,
            value: `${best}`,
            sub: best > 1 && cur === best ? "ongoing" : undefined,
          };
        })
        .filter((e) => e.sortKey > 1),
      { viewerTeamId }
    ),
  });

  boards.push({
    id: "big-win",
    title: "Biggest win",
    blurb: "Largest winning margin in a single match",
    rows: rankRows(
      played
        .filter((a) => a.bestWin)
        .map((agg) => ({
          agg,
          sortKey: agg.bestWin!.margin,
          value: `+${agg.bestWin!.margin}`,
          sub: agg.bestWin!.label,
        })),
      { viewerTeamId }
    ),
  });

  return {
    season: { id: season.id, name: season.name },
    playedFixtures: fixtures.length,
    boards: boards.filter((b) => b.rows.length > 0),
  };
}
