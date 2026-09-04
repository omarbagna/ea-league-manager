"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { forceDeleteTournament } from "@/actions/tournaments";
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

export function ForceDeleteTournamentDialog({
  tournamentId,
  tournamentName,
  status,
}: {
  tournamentId: string;
  tournamentName: string;
  status: "locked" | "active" | "completed";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await forceDeleteTournament(tournamentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/admin/tournaments");
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
        <Button type="button" variant="destructive" size="sm">
          <Trash2 className="size-4" />
          Delete tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,32rem)]">
        <DialogHeader>
          <DialogTitle>Delete {tournamentName}?</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-3 text-sm text-on-surface-variant">
          <DialogDescription>
            This tournament is {status === "completed" ? "completed" : "in progress"} —
            deleting it permanently removes every entrant, round and
            reported result. Unlike a draft tournament, this can&apos;t be
            undone.
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
            variant="destructive"
            loading={pending}
            onClick={handleConfirm}
          >
            Delete permanently
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
