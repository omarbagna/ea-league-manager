"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { reportKnockoutResult } from "@/actions/tournaments";
import type { TournamentDetail, TournamentMatch } from "@/lib/queries/tournaments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { WarningNote } from "@/components/ui/warning-note";
import { cn } from "@/lib/utils";

function MatchRow({
  tournamentId,
  match,
}: {
  tournamentId: string;
  match: TournamentMatch;
}) {
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameA = match.entrantA?.teamName ?? (match.isBye ? "—" : "TBD");
  const nameB = match.entrantB?.teamName ?? (match.isBye ? "—" : "TBD");

  const handleSubmit = () => {
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setError("Enter a whole number for each score.");
      return;
    }
    if (a === b) {
      setError("A knockout match can't end in a draw.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reportKnockoutResult(tournamentId, match.id, a, b);
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  };

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span
            className={cn(
              "min-w-0 truncate font-medium",
              match.winnerEntrantId === match.entrantA?.id &&
                "text-secondary-fixed"
            )}
          >
            {nameA}
          </span>
          {match.status === "completed" ? (
            <span className="shrink-0 font-data tabular font-bold text-on-surface">
              {match.scoreA}&ndash;{match.scoreB}
            </span>
          ) : (
            <span className="shrink-0 font-data text-xs text-outline">vs</span>
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-right font-medium",
              match.winnerEntrantId === match.entrantB?.id &&
                "text-secondary-fixed"
            )}
          >
            {nameB}
          </span>
        </div>
        {match.isBye && (
          <StatusPill tone="neutral" className="shrink-0">
            Bye
          </StatusPill>
        )}
        {match.status === "completed" && !match.isBye && (
          <StatusPill tone="positive" className="shrink-0">
            Final
          </StatusPill>
        )}
      </div>

      {match.status === "ready" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/50 pt-2.5">
          <Input
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            className="h-9 w-16 text-center"
          />
          <span className="font-data text-xs text-outline">
            {nameA.split(" ")[0]}
          </span>
          <span className="mx-1 text-outline-variant">&ndash;</span>
          <Input
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            className="h-9 w-16 text-center"
          />
          <span className="font-data text-xs text-outline">
            {nameB.split(" ")[0]}
          </span>
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            loading={pending}
            onClick={handleSubmit}
          >
            Report result
          </Button>
        </div>
      )}
      {error && <WarningNote tone="critical">{error}</WarningNote>}
    </li>
  );
}

export function TournamentBracketAdmin({
  tournament,
}: {
  tournament: TournamentDetail;
}) {
  return (
    <div className="space-y-6">
      {tournament.champion && (
        <Card variant="accent" className="flex items-center gap-3 p-5">
          <Trophy className="size-8 shrink-0 text-primary-fixed" />
          <div>
            <p className="font-data text-[11px] uppercase tracking-widest text-on-surface-variant">
              Champion
            </p>
            <p className="font-display text-xl font-bold text-primary">
              {tournament.champion.teamName}
            </p>
          </div>
        </Card>
      )}

      {tournament.rounds.map((round) => (
        <Card key={round.id} variant="outline">
          <CardHeader>
            <CardTitle className="text-base">{round.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {round.matches.map((m) => (
                <MatchRow key={m.id} tournamentId={tournament.id} match={m} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
