/**
 * Pure single-elimination bracket generator — no Supabase, fully
 * unit-testable, mirroring the conventions in double-round-robin.ts.
 *
 * The bracket is sized to the smallest power of two that fits the
 * entrant count (capped at `maxSize`, the tournament's declared team
 * count), not always padded out to `maxSize` — five sign-ups on a
 * 16-team tournament produce an 8-slot bracket with three byes, not a
 * 16-slot bracket mostly full of byes. `maxSize` is what caps how big
 * the bracket is *allowed* to grow, not what it's forced to become.
 */

export type BracketSlot = { entrantId: string | null };

export type BracketMatchSeed = {
  slotIndex: number;
  a: BracketSlot;
  b: BracketSlot;
};

export type BracketRound = {
  /** 1-indexed; round 1 is the first round, the highest number is the final */
  roundNumber: number;
  name: string;
  /** only round 1 carries real slot assignments — later rounds are empty placeholders, sized by bracket math, filled in as earlier rounds complete */
  matches: BracketMatchSeed[];
};

export type Bracket = {
  /** number of slots in round 1 — a power of two */
  size: number;
  totalRounds: number;
  rounds: BracketRound[];
};

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

/** "Round of 16" / "Quarter-final" / "Semi-final" / "Final", from how many rounds remain after this one. */
export function roundName(roundNumber: number, totalRounds: number): string {
  const remaining = totalRounds - roundNumber;
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semi-final";
  if (remaining === 2) return "Quarter-final";
  return `Round of ${2 ** (remaining + 1)}`;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildSingleEliminationBracket(
  entrantIds: string[],
  maxSize: number,
  rng: () => number = Math.random
): Bracket {
  if (entrantIds.length < 2) {
    throw new Error("Need at least 2 entrants to generate a bracket");
  }
  if (!isPowerOfTwo(maxSize)) {
    throw new Error("maxSize must be a power of two");
  }
  if (entrantIds.length > maxSize) {
    throw new Error("More entrants than the tournament's declared size");
  }

  const size = nextPowerOfTwo(entrantIds.length);
  const shuffled = shuffle(entrantIds, rng);

  // Real entrants fill slots [0, count); the rest are byes. Pairing slot i
  // with slot (size-1-i) guarantees no match ever has two byes: since
  // byes = size - count < size / 2 (size is the *smallest* power of two
  // that fits count, so count > size / 2), a bye can only ever land
  // opposite a real entrant.
  const slots: (string | null)[] = Array.from({ length: size }, (_, i) =>
    i < shuffled.length ? shuffled[i] : null
  );

  const totalRounds = Math.log2(size);

  const round1: BracketMatchSeed[] = [];
  for (let i = 0; i < size / 2; i++) {
    round1.push({
      slotIndex: i,
      a: { entrantId: slots[i] },
      b: { entrantId: slots[size - 1 - i] },
    });
  }

  const rounds: BracketRound[] = [
    { roundNumber: 1, name: roundName(1, totalRounds), matches: round1 },
  ];
  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = size / 2 ** r;
    rounds.push({
      roundNumber: r,
      name: roundName(r, totalRounds),
      matches: Array.from({ length: matchesInRound }, (_, i) => ({
        slotIndex: i,
        a: { entrantId: null },
        b: { entrantId: null },
      })),
    });
  }

  return { size, totalRounds, rounds };
}
