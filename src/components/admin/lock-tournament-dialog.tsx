"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { lockAndGenerateBracket } from "@/actions/tournaments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WarningNote } from "@/components/ui/warning-note";

export function LockTournamentDialog({
  tournamentId,
  entrantCount,
}: {
  tournamentId: string;
  entrantCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await lockAndGenerateBracket(tournamentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      window.location.reload();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={entrantCount < 2}>
          <Trophy className="size-4" />
          Close signups &amp; generate bracket
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,32rem)]">
        <DialogHeader>
          <DialogTitle>Generate the bracket?</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-3 text-sm text-on-surface-variant">
          <DialogDescription>
            Signups close immediately and {entrantCount}{" "}
            {entrantCount === 1 ? "team is" : "teams are"} seeded into a
            bracket at random. This can&apos;t be undone — entrants can no
            longer be added or removed once it&apos;s generated.
          </DialogDescription>
          {error && <WarningNote tone="critical">{error}</WarningNote>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            loading={pending}
            onClick={handleConfirm}
          >
            Generate bracket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
