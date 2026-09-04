import { describe, expect, it } from "vitest";
import { buildSingleEliminationBracket, roundName } from "@/lib/scheduling/single-elimination";

function ids(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `entrant-${i + 1}`);
}

/** deterministic "shuffle" for reproducible assertions */
function noShuffle(): number {
  return 0;
}

describe("buildSingleEliminationBracket", () => {
  it("throws with fewer than 2 entrants", () => {
    expect(() => buildSingleEliminationBracket([], 8)).toThrow();
    expect(() => buildSingleEliminationBracket(["a"], 8)).toThrow();
  });

  it("throws when maxSize is not a power of two", () => {
    expect(() => buildSingleEliminationBracket(ids(4), 6)).toThrow();
  });

  it("throws when more entrants signed up than the declared size allows", () => {
    expect(() => buildSingleEliminationBracket(ids(9), 8)).toThrow();
  });

  it("builds an exact bracket with no byes for a power-of-two field", () => {
    const bracket = buildSingleEliminationBracket(ids(8), 16, noShuffle);
    expect(bracket.size).toBe(8);
    expect(bracket.totalRounds).toBe(3);
    const round1 = bracket.rounds[0];
    expect(round1.matches).toHaveLength(4);
    for (const m of round1.matches) {
      expect(m.a.entrantId).not.toBeNull();
      expect(m.b.entrantId).not.toBeNull();
    }
  });

  it("shrinks the bracket to the smallest size that fits an under-subscribed field, not the declared max", () => {
    const bracket = buildSingleEliminationBracket(ids(5), 16, noShuffle);
    expect(bracket.size).toBe(8);
    expect(bracket.rounds[0].matches).toHaveLength(4);
  });

  it("never pairs two byes against each other", () => {
    for (let count = 2; count <= 20; count++) {
      const maxSize = 32;
      const bracket = buildSingleEliminationBracket(ids(count), maxSize);
      for (const m of bracket.rounds[0].matches) {
        const bothByes = m.a.entrantId === null && m.b.entrantId === null;
        expect(bothByes).toBe(false);
      }
    }
  });

  it("every entrant appears in exactly one round-1 slot", () => {
    const entrantIds = ids(11);
    const bracket = buildSingleEliminationBracket(entrantIds, 16);
    const seen = bracket.rounds[0].matches.flatMap((m) =>
      [m.a.entrantId, m.b.entrantId].filter((x): x is string => x !== null)
    );
    expect(seen.sort()).toEqual([...entrantIds].sort());
  });

  it("resolves to exactly one final for every valid bracket size", () => {
    for (const size of [2, 4, 8, 16, 32, 64]) {
      const bracket = buildSingleEliminationBracket(ids(size), size);
      const final = bracket.rounds[bracket.rounds.length - 1];
      expect(final.matches).toHaveLength(1);
      expect(final.name).toBe("Final");
    }
  });

  it("later rounds are sized correctly and start empty", () => {
    const bracket = buildSingleEliminationBracket(ids(16), 16, noShuffle);
    expect(bracket.rounds.map((r) => r.matches.length)).toEqual([8, 4, 2, 1]);
    for (const round of bracket.rounds.slice(1)) {
      for (const m of round.matches) {
        expect(m.a.entrantId).toBeNull();
        expect(m.b.entrantId).toBeNull();
      }
    }
  });
});

describe("roundName", () => {
  it("names rounds counting back from the final", () => {
    expect(roundName(4, 4)).toBe("Final");
    expect(roundName(3, 4)).toBe("Semi-final");
    expect(roundName(2, 4)).toBe("Quarter-final");
    expect(roundName(1, 4)).toBe("Round of 16");
    expect(roundName(1, 3)).toBe("Quarter-final");
    expect(roundName(1, 5)).toBe("Round of 32");
    expect(roundName(1, 1)).toBe("Final");
  });
});
