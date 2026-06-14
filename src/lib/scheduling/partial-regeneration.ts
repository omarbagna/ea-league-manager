import {
  buildMatchweekSchedule,
  getWeekendRange,
  parseAnchorDate,
  seasonEndDateAfterLastMatchweek,
  type FixturePair,
} from "@/lib/scheduling/double-round-robin";

export type ExistingFixture = {
  home_team_id: string;
  away_team_id: string;
  status: "scheduled" | "in_progress" | "completed";
  matchweek_number: number;
};

export type MatchweekRow = {
  id: string;
  number: number;
  starts_at: string | null;
  ends_at: string | null;
};

export type PlannedFixture = {
  matchweek_number: number;
  home_team_id: string;
  away_team_id: string;
};

export type NewMatchweekRow = {
  season_id: string;
  number: number;
  starts_at: string;
  ends_at: string;
};

export type RegenerationPlan = {
  plannedFixtures: PlannedFixture[];
  newMatchweeks: NewMatchweekRow[];
  seasonEndsAt: string | null;
};

function legKey(homeId: string, awayId: string): string {
  return `${homeId}:${awayId}`;
}

/** Collect double round-robin legs not yet played or scheduled before the cutoff. */
export function collectMissingLegs(
  activeTeamIds: string[],
  existingFixtures: ExistingFixture[],
  cutoffMatchweekNumber: number
): FixturePair[] {
  if (activeTeamIds.length < 2) return [];

  const existingLegs = new Set<string>();
  for (const fixture of existingFixtures) {
    const countsAsExisting =
      fixture.status === "completed" ||
      fixture.status === "in_progress" ||
      (fixture.status === "scheduled" &&
        fixture.matchweek_number < cutoffMatchweekNumber);

    if (countsAsExisting) {
      existingLegs.add(legKey(fixture.home_team_id, fixture.away_team_id));
    }
  }

  const { rounds } = buildMatchweekSchedule(activeTeamIds);
  const missing: FixturePair[] = [];

  for (const round of rounds) {
    for (const pair of round) {
      const key = legKey(pair.homeId, pair.awayId);
      if (!existingLegs.has(key)) {
        missing.push(pair);
        existingLegs.add(key);
      }
    }
  }

  return missing;
}

function fixturesPerMatchweek(activeTeamIds: string[]): number {
  const { matchweeks } = buildMatchweekSchedule(activeTeamIds);
  return matchweeks[0]?.length ?? 0;
}

/** Assign missing legs into matchweeks from the cutoff onward, appending weeks if needed. */
export function planRegeneratedFixtures(
  seasonId: string,
  activeTeamIds: string[],
  cutoffMatchweekNumber: number,
  existingFixtures: ExistingFixture[],
  matchweeks: MatchweekRow[]
): RegenerationPlan {
  if (activeTeamIds.length < 2) {
    return { plannedFixtures: [], newMatchweeks: [], seasonEndsAt: null };
  }

  const missingLegs = collectMissingLegs(
    activeTeamIds,
    existingFixtures,
    cutoffMatchweekNumber
  );

  const sortedWeeks = [...matchweeks].sort((a, b) => a.number - b.number);
  const lastWeek = sortedWeeks[sortedWeeks.length - 1];

  if (missingLegs.length === 0) {
    return {
      plannedFixtures: [],
      newMatchweeks: [],
      seasonEndsAt: lastWeek?.ends_at
        ? seasonEndDateAfterLastMatchweek(lastWeek.ends_at)
        : null,
    };
  }

  const perWeekCapacity = Math.max(fixturesPerMatchweek(activeTeamIds), 1);
  const futureWeekNumbers = sortedWeeks
    .filter((mw) => mw.number >= cutoffMatchweekNumber)
    .map((mw) => mw.number);

  const newMatchweeks: NewMatchweekRow[] = [];
  const weekNumbers = [...futureWeekNumbers];
  let nextWeekNumber =
    sortedWeeks.length > 0
      ? Math.max(...sortedWeeks.map((mw) => mw.number)) + 1
      : cutoffMatchweekNumber;

  const anchor = parseAnchorDate(sortedWeeks[0]?.starts_at ?? null);
  let appendIndex = sortedWeeks.length;

  while (weekNumbers.length < Math.ceil(missingLegs.length / perWeekCapacity)) {
    const { startsAt, endsAt } = getWeekendRange(anchor, appendIndex);
    newMatchweeks.push({
      season_id: seasonId,
      number: nextWeekNumber,
      starts_at: startsAt,
      ends_at: endsAt,
    });
    weekNumbers.push(nextWeekNumber);
    nextWeekNumber += 1;
    appendIndex += 1;
  }

  const plannedFixtures: PlannedFixture[] = [];
  let legIndex = 0;

  for (const weekNumber of weekNumbers) {
    const batch = missingLegs.slice(legIndex, legIndex + perWeekCapacity);
    if (batch.length === 0) break;

    for (const pair of batch) {
      plannedFixtures.push({
        matchweek_number: weekNumber,
        home_team_id: pair.homeId,
        away_team_id: pair.awayId,
      });
    }

    legIndex += batch.length;
    if (legIndex >= missingLegs.length) break;
  }

  const allWeekEnds = [
    ...sortedWeeks.map((mw) => mw.ends_at),
    ...newMatchweeks.map((mw) => mw.ends_at),
  ].filter((value): value is string => Boolean(value));

  const lastEndsAt = allWeekEnds.length ? allWeekEnds.sort().at(-1)! : null;

  return {
    plannedFixtures,
    newMatchweeks,
    seasonEndsAt: lastEndsAt
      ? seasonEndDateAfterLastMatchweek(lastEndsAt)
      : null,
  };
}
