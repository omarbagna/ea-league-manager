"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import type { TournamentDetail, TournamentMatch } from "@/lib/queries/tournaments";
import { TeamCrest } from "@/components/league/team-crest";
import { CountUpScore } from "@/components/league/count-up-score";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * The visual bracket. Every round column shares one fixed pixel height —
 * `round1Count * SLOT_PX` — and every column (round 1 included) lays its
 * matches out with `justify-content: space-around`. That single choice is
 * what makes the connectors line up for free: with N equal-weight flex
 * items under space-around, item i's centre sits at (2i+1)/(2N) of the
 * container height. A round with N/2 matches in the *same* height
 * container centres item i at (2i+1)/N — exactly the midpoint of round
 * r's items 2i and 2i+1. No per-round pixel math, no JS layout pass.
 */
const SLOT_PX = 108;
const COLUMN_W = 208;
const GAP_PX = 48;

function EntrantRow({
  entrant,
  score,
  won,
  showScore,
  placeholder,
}: {
  entrant: TournamentMatch["entrantA"];
  score: number | null;
  won: boolean;
  showScore: boolean;
  placeholder: string;
}) {
  const content = (
    <div
      className={cn(
        // fixed height regardless of content — a bye row and a scored row
        // must render pixel-identical, or the space-around centring the
        // connector math relies on drifts by a few px per bye
        "flex h-10 items-center gap-2 px-2.5",
        won && "bg-secondary-fixed/[0.08]"
      )}
    >
      {entrant ? (
        <>
          <TeamCrest
            name={entrant.teamName}
            seed={entrant.crestSeed}
            size="sm"
            className="size-6 shrink-0"
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              won ? "font-semibold text-secondary-fixed" : "font-medium text-on-surface"
            )}
          >
            {entrant.teamName}
          </span>
        </>
      ) : (
        <span className="flex-1 truncate text-sm text-outline">{placeholder}</span>
      )}
      {showScore && score !== null && (
        <span
          className={cn(
            "shrink-0 font-data tabular text-sm font-bold",
            won ? "text-secondary-fixed" : "text-on-surface-variant"
          )}
        >
          <CountUpScore value={score} />
        </span>
      )}
    </div>
  );

  return content;
}

function MatchCard({ match, isFinal }: { match: TournamentMatch; isFinal: boolean }) {
  const aWon = !!match.winnerEntrantId && match.winnerEntrantId === match.entrantA?.id;
  const bWon = !!match.winnerEntrantId && match.winnerEntrantId === match.entrantB?.id;
  const completed = match.status === "completed";

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-lg border bg-card",
        isFinal && completed
          ? "border-primary-container/50 accent-glow"
          : "border-outline-variant"
      )}
      style={{ width: COLUMN_W }}
    >
      <EntrantRow
        entrant={match.entrantA}
        score={match.scoreA}
        won={aWon}
        showScore={completed}
        placeholder={match.isBye ? "Bye" : "TBD"}
      />
      <div className="h-px bg-outline-variant/60" />
      <EntrantRow
        entrant={match.entrantB}
        score={match.scoreB}
        won={bWon}
        showScore={completed}
        placeholder={match.isBye ? "Bye" : "TBD"}
      />
      {match.status === "ready" && (
        <span className="absolute -right-1.5 -top-1.5">
          <StatusPill tone="live" pulse>
            Next
          </StatusPill>
        </span>
      )}
    </div>
  );
}

function ConnectorColumn({ pairCount }: { pairCount: number }) {
  return (
    <div className="relative shrink-0" style={{ width: GAP_PX }}>
      {Array.from({ length: pairCount }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 w-full"
          style={{ top: `${(i * 100) / pairCount}%`, height: `${100 / pairCount}%` }}
        >
          <span
            aria-hidden
            className="absolute left-0 border-t border-outline-variant"
            style={{ top: "25%", width: GAP_PX / 2 }}
          />
          <span
            aria-hidden
            className="absolute left-0 border-t border-outline-variant"
            style={{ top: "75%", width: GAP_PX / 2 }}
          />
          <span
            aria-hidden
            className="absolute border-l border-outline-variant"
            style={{ left: GAP_PX / 2, top: "25%", bottom: "25%" }}
          />
          <span
            aria-hidden
            className="absolute border-t border-outline-variant"
            style={{ top: "50%", left: GAP_PX / 2, width: GAP_PX / 2 }}
          />
        </div>
      ))}
    </div>
  );
}

function DesktopBracket({ tournament }: { tournament: TournamentDetail }) {
  const { rounds } = tournament;
  const round1Count = rounds[0]?.matches.length ?? 0;
  const height = Math.max(round1Count, 1) * SLOT_PX;

  return (
    <div className="hidden overflow-x-auto pb-2 md:block">
      <div className="inline-flex flex-col">
        <div className="flex">
          {rounds.map((round, ri) => (
            <div key={round.id} className="flex shrink-0">
              {ri > 0 && <div style={{ width: GAP_PX }} />}
              <div
                className="text-center font-data text-[11px] uppercase tracking-widest text-on-surface-variant"
                style={{ width: COLUMN_W }}
              >
                {round.name}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex" style={{ height }}>
          {rounds.map((round, ri) => (
            <div key={round.id} className="flex shrink-0">
              {ri > 0 && <ConnectorColumn pairCount={round.matches.length} />}
              <div
                className="flex shrink-0 flex-col justify-around"
                style={{ width: COLUMN_W, height }}
              >
                {round.matches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    isFinal={ri === rounds.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileBracket({ tournament }: { tournament: TournamentDetail }) {
  const { rounds } = tournament;
  const defaultRoundId = useMemo(() => {
    const inPlay = rounds.find((r) => r.matches.some((m) => m.status === "ready"));
    if (inPlay) return inPlay.id;
    const upcoming = rounds.find((r) => r.matches.some((m) => m.status !== "completed"));
    return (upcoming ?? rounds[rounds.length - 1])?.id;
  }, [rounds]);
  const [roundId, setRoundId] = useState(defaultRoundId);
  const active = rounds.find((r) => r.id === roundId) ?? rounds[0];

  return (
    <div className="md:hidden">
      <div className="overflow-x-auto pb-1">
        <Tabs value={roundId} onValueChange={setRoundId}>
          <TabsList>
            {rounds.map((r) => (
              <TabsTrigger key={r.id} value={r.id} className="whitespace-nowrap">
                {r.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {active?.matches.map((m) => (
          <div key={m.id} className="w-full">
            <MatchCard match={m} isFinal={active.roundNumber === rounds[rounds.length - 1].roundNumber} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TournamentBracketView({ tournament }: { tournament: TournamentDetail }) {
  if (!tournament.rounds.length) return null;

  return (
    <div className="space-y-6">
      {tournament.champion && (
        <div className="flex items-center gap-3 rounded-xl border border-primary-container/50 bg-card p-5 accent-glow">
          <Trophy className="size-8 shrink-0 text-primary-fixed" />
          <div>
            <p className="font-data text-[11px] uppercase tracking-widest text-on-surface-variant">
              Champion
            </p>
            <p className="font-display text-xl font-bold text-primary">
              {tournament.champion.teamName}
            </p>
          </div>
        </div>
      )}

      <DesktopBracket tournament={tournament} />
      <MobileBracket tournament={tournament} />
    </div>
  );
}
