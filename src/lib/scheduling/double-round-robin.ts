import { addDays, addWeeks, format, parseISO, startOfDay } from "date-fns";

export type FixturePair = { homeId: string; awayId: string };

const BYE = "__BYE__";
const MAX_ATTEMPTS = 50;

export function shuffleTeams<T>(ids: T[], rng: () => number = Math.random): T[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Circle / Berger method — one round-robin leg. */
export function buildSingleRoundRobinRounds(teamIds: string[]): FixturePair[][] {
  const teams =
    teamIds.length % 2 === 1 ? [...teamIds, BYE] : [...teamIds];
  const n = teams.length;
  const rounds: FixturePair[][] = [];
  const rotation = teams.slice(1);

  for (let round = 0; round < n - 1; round++) {
    const roundTeams = [teams[0], ...rotation];
    const pairs: FixturePair[] = [];

    for (let i = 0; i < n / 2; i++) {
      const a = roundTeams[i];
      const b = roundTeams[n - 1 - i];
      if (a === BYE || b === BYE) continue;

      // Fixed team alternates home/away; other pairings use stable home = first in circle slot
      if (i === 0) {
        pairs.push(
          round % 2 === 0
            ? { homeId: a, awayId: b }
            : { homeId: b, awayId: a }
        );
      } else {
        pairs.push({ homeId: a, awayId: b });
      }
    }

    rounds.push(pairs);
    rotation.unshift(rotation.pop()!);
  }

  return rounds;
}

function minLegGap(teamCount: number): number {
  // Two-team leagues only have one opponent; consecutive weeks are acceptable.
  return teamCount === 2 ? 1 : 2;
}

function validateLegSpacing(
  rounds: FixturePair[][],
  gap: number
): boolean {
  const pairRounds = new Map<string, number[]>();

  rounds.forEach((round, roundIndex) => {
    for (const f of round) {
      const key = pairKey(f.homeId, f.awayId);
      const existing = pairRounds.get(key) ?? [];
      existing.push(roundIndex);
      pairRounds.set(key, existing);
    }
  });

  for (const roundsForPair of pairRounds.values()) {
    if (roundsForPair.length !== 2) return false;
    const [r1, r2] = roundsForPair.sort((a, b) => a - b);
    if (Math.abs(r2 - r1) < gap) return false;
  }

  return true;
}

/**
 * Double round-robin: every pair twice (home + away), return leg not back-to-back.
 */
export function buildDoubleRoundRobinSchedule(
  teamIds: string[],
  rng: () => number = Math.random
): FixturePair[][] {
  if (teamIds.length < 2) {
    throw new Error("Need at least 2 teams");
  }

  const gap = minLegGap(teamIds.length);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shuffled = shuffleTeams(teamIds, rng);
    const firstHalf = buildSingleRoundRobinRounds(shuffled);
    const halfLen = firstHalf.length;
    const totalRounds = halfLen * 2;
    const schedule: FixturePair[][] = Array.from({ length: totalRounds }, () => []);

    const pairFirstRound = new Map<string, number>();
    for (let r = 0; r < halfLen; r++) {
      schedule[r] = [...firstHalf[r]];
      for (const f of firstHalf[r]) {
        pairFirstRound.set(pairKey(f.homeId, f.awayId), r);
      }
    }

    for (let r = 0; r < halfLen; r++) {
      for (const f of firstHalf[r]) {
        const returnRound = r + halfLen;
        schedule[returnRound].push({
          homeId: f.awayId,
          awayId: f.homeId,
        });
      }
    }

    if (validateLegSpacing(schedule, gap)) {
      return schedule;
    }
  }

  // Deterministic fallback without shuffle
  const firstHalf = buildSingleRoundRobinRounds([...teamIds].sort());
  const halfLen = firstHalf.length;
  const schedule: FixturePair[][] = Array.from(
    { length: halfLen * 2 },
    () => []
  );

  for (let r = 0; r < halfLen; r++) {
    schedule[r] = [...firstHalf[r]];
    for (const f of firstHalf[r]) {
      schedule[r + halfLen].push({ homeId: f.awayId, awayId: f.homeId });
    }
  }

  return schedule;
}

export function snapToSaturday(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  if (day === 6) return d;
  if (day === 0) return addDays(d, -1);
  return addDays(d, 6 - day);
}

export function getWeekendRange(
  anchorDate: Date,
  weekIndex: number
): { startsAt: string; endsAt: string } {
  const saturday = addWeeks(snapToSaturday(anchorDate), weekIndex);
  const sunday = addDays(saturday, 1);
  return {
    startsAt: format(saturday, "yyyy-MM-dd"),
    endsAt: format(sunday, "yyyy-MM-dd"),
  };
}

export function parseAnchorDate(value?: string | null): Date {
  if (value) {
    const parsed = parseISO(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return snapToSaturday(new Date());
}

export function countFixtures(rounds: FixturePair[][]): number {
  return rounds.reduce((sum, r) => sum + r.length, 0);
}

/** Two games per matchweek when the league is large enough; 2-team leagues stay at one. */
export function roundsPerMatchweek(teamCount: number): number {
  return teamCount >= 3 ? 2 : 1;
}

export type MatchweekSchedule = {
  /** Raw scheduling rounds (one fixture per team per round, before grouping). */
  rounds: FixturePair[][];
  roundsPerWeek: number;
  /** Fixtures grouped into calendar matchweeks. */
  matchweeks: FixturePair[][];
};

/** Double round-robin rounds bundled into matchweeks (2 games/team/week when n ≥ 3). */
export function buildMatchweekSchedule(
  teamIds: string[],
  rng: () => number = Math.random
): MatchweekSchedule {
  const rounds = buildDoubleRoundRobinSchedule(teamIds, rng);
  const perWeek = roundsPerMatchweek(teamIds.length);
  const matchweeks: FixturePair[][] = [];

  for (let i = 0; i < rounds.length; i += perWeek) {
    matchweeks.push(rounds.slice(i, i + perWeek).flat());
  }

  return { rounds, roundsPerWeek: perWeek, matchweeks };
}

export function countMatchweeks(teamCount: number): number {
  if (teamCount < 2) return 0;
  const halfLen = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
  const totalRounds = halfLen * 2;
  return Math.ceil(totalRounds / roundsPerMatchweek(teamCount));
}

/** Season ends the day after the last matchweek weekend (Sunday → Monday). */
export function seasonEndDateAfterLastMatchweek(
  lastMatchweekEndsAt: string
): string {
  const parsed = parseISO(lastMatchweekEndsAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid last matchweek end date");
  }
  return format(addDays(startOfDay(parsed), 1), "yyyy-MM-dd");
}
