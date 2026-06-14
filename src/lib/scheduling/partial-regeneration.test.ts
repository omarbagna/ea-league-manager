import { describe, expect, it } from "vitest";
import {
  buildMatchweekSchedule,
  countFixtures,
} from "@/lib/scheduling/double-round-robin";
import {
  collectMissingLegs,
  planRegeneratedFixtures,
  type ExistingFixture,
  type MatchweekRow,
} from "@/lib/scheduling/partial-regeneration";

const teamIds = ["t1", "t2", "t3", "t4", "t5", "t6"];

function makeMatchweeks(count: number): MatchweekRow[] {
  return Array.from({ length: count }, (_, index) => {
    const day = index * 7 + 3;
    const startDay = String(Math.min(day, 28)).padStart(2, "0");
    const endDay = String(Math.min(day + 1, 28)).padStart(2, "0");
    return {
      id: `mw-${index + 1}`,
      number: index + 1,
      starts_at: `2026-03-${startDay}`,
      ends_at: `2026-03-${endDay}`,
    };
  });
}

describe("collectMissingLegs", () => {
  it("returns full double round-robin when no fixtures exist", () => {
    const missing = collectMissingLegs(teamIds, [], 1);
    const target = buildMatchweekSchedule(teamIds);
    expect(missing.length).toBe(countFixtures(target.rounds));
  });

  it("excludes legs already completed before cutoff", () => {
    const existing: ExistingFixture[] = [
      {
        home_team_id: "t1",
        away_team_id: "t2",
        status: "completed",
        matchweek_number: 1,
      },
    ];

    const missing = collectMissingLegs(teamIds, existing, 3);
    const hasReverseLeg = missing.some(
      (leg) => leg.homeId === "t2" && leg.awayId === "t1"
    );
    const hasSameLeg = missing.some(
      (leg) => leg.homeId === "t1" && leg.awayId === "t2"
    );

    expect(hasSameLeg).toBe(false);
    expect(hasReverseLeg).toBe(true);
  });

  it("counts scheduled fixtures before cutoff as existing", () => {
    const existing: ExistingFixture[] = [
      {
        home_team_id: "t1",
        away_team_id: "t3",
        status: "scheduled",
        matchweek_number: 2,
      },
    ];

    const missing = collectMissingLegs(teamIds, existing, 4);
    expect(
      missing.some((leg) => leg.homeId === "t1" && leg.awayId === "t3")
    ).toBe(false);
  });

  it("returns empty when fewer than two active teams remain", () => {
    expect(collectMissingLegs(["t1"], [], 1)).toEqual([]);
  });
});

describe("planRegeneratedFixtures", () => {
  it("plans fixtures from cutoff matchweek onward", () => {
    const matchweeks = makeMatchweeks(8);
    const plan = planRegeneratedFixtures("season-1", teamIds, 4, [], matchweeks);

    expect(plan.plannedFixtures.length).toBeGreaterThan(0);
    expect(
      plan.plannedFixtures.every((fixture) => fixture.matchweek_number >= 4)
    ).toBe(true);
  });

  it("does not duplicate legs already scheduled before cutoff", () => {
    const matchweeks = makeMatchweeks(8);
    const existing: ExistingFixture[] = [
      {
        home_team_id: "t1",
        away_team_id: "t2",
        status: "scheduled",
        matchweek_number: 2,
      },
      {
        home_team_id: "t3",
        away_team_id: "t4",
        status: "completed",
        matchweek_number: 1,
      },
    ];

    const plan = planRegeneratedFixtures(
      "season-1",
      teamIds,
      5,
      existing,
      matchweeks
    );

    const duplicate = plan.plannedFixtures.some(
      (fixture) =>
        fixture.home_team_id === "t1" && fixture.away_team_id === "t2"
    );
    expect(duplicate).toBe(false);
  });

  it("returns no fixtures when fewer than two teams remain", () => {
    const plan = planRegeneratedFixtures(
      "season-1",
      ["t1"],
      3,
      [],
      makeMatchweeks(5)
    );

    expect(plan.plannedFixtures).toEqual([]);
    expect(plan.newMatchweeks).toEqual([]);
  });

  it("appends matchweeks when future weeks are insufficient", () => {
    const matchweeks = makeMatchweeks(4);
    const plan = planRegeneratedFixtures("season-1", teamIds, 4, [], matchweeks);

    expect(plan.newMatchweeks.length).toBeGreaterThan(0);
    expect(plan.seasonEndsAt).not.toBeNull();
  });
});
