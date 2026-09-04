"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { disqualifyPlayerFromSeason } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DisqualifyTeamDialog({
  teamId,
  teamName,
  seasonName,
  hasSchedule,
}: {
  teamId: string;
  teamName: string;
  seasonName: string;
  hasSchedule: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [message, setMessage] = useState<{ error?: string }>({});
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setMessage({});
    startTransition(async () => {
      const result = await disqualifyPlayerFromSeason(
        teamId,
        adminNotes.trim() || undefined
      );
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
        if (!next) {
          setAdminNotes("");
          setMessage({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={!hasSchedule}
          title={
            hasSchedule
              ? undefined
              : "Generate a schedule before disqualifying a team"
          }
        >
          Disqualify
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-outline-variant bg-surface-container-high">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary">
            <AlertTriangle className="size-5 text-error" aria-hidden />
            Disqualify from season
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-on-surface-variant">
          <DialogDescription>
            Remove <strong className="text-on-surface">{teamName}</strong> from{" "}
            <strong className="text-on-surface">{seasonName}</strong> for the rest of
            the season.
          </DialogDescription>
          <ul className="list-disc space-y-1 pl-5">
            <li>Completed results before disqualification are kept.</li>
            <li>
              Opponents from the current matchweek onward receive automatic 3–0
              forfeit wins.
            </li>
            <li>
              Remaining scheduled fixtures from that point are removed and
              regenerated among active teams.
            </li>
          </ul>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              Admin notes (optional)
            </span>
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface"
              placeholder="Reason for disqualification…"
            />
          </label>

          {message.error && (
            <p className="rounded-lg border border-error/40 bg-error-container/20 px-3 py-2 text-sm text-error">
              {message.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              loading={pending}
            >
              Confirm disqualification
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
