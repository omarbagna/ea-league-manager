"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { adminRevertSubmission } from "@/actions/admin";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RevertableSubmission } from "@/lib/queries/submissions";
import { cn } from "@/lib/utils";
import type { FixtureWithTeams } from "@/types/database";

function formatTimeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";

  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function AdminFixtureRevertDialog({
  fixture,
  revertable,
}: {
  fixture: FixtureWithTeams;
  revertable: RevertableSubmission;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ error?: string }>({});
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setMessage({});
    startTransition(async () => {
      const result = await adminRevertSubmission(revertable.submissionId);
      if (result.error) {
        setMessage({ error: result.error });
        return;
      }
      window.location.reload();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMessage({});
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full font-data text-xs uppercase tracking-widest text-secondary-fixed hover:bg-secondary-fixed/10 hover:text-secondary-fixed"
        >
          <RotateCcw className="size-3.5" />
          Revert result
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,32rem)]">
        <DialogHeader>
          <DialogTitle>Revert finalized result</DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            "space-y-4",
            pending && "pointer-events-none opacity-60"
          )}
          aria-busy={pending}
        >
          <p className="text-sm text-on-surface-variant">
            {fixture.home_team.name} vs {fixture.away_team.name} — undo this
            result and reopen the fixture for a new submission.
          </p>

          <MatchScoreStatus
            homeTeamName={fixture.home_team.name}
            awayTeamName={fixture.away_team.name}
            yourScore={{
              homeScore: revertable.homeScore,
              awayScore: revertable.awayScore,
            }}
            opponentScore={null}
            yourLabel="Finalized score"
          />

          <p className="font-data text-xs text-outline">
            {formatTimeRemaining(revertable.expiresAt)}
          </p>

          <p className="rounded-lg border border-secondary-fixed/30 bg-secondary-fixed/5 px-3 py-2 text-sm text-on-surface-variant">
            Match evidence was deleted after approval. Both players must submit a
            new result with fresh screenshots.
          </p>

          {message.error && <p className="text-sm text-error">{message.error}</p>}

          <Button
            variant="secondary"
            className="w-full"
            loading={pending}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "Reverting…" : "Revert result"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
