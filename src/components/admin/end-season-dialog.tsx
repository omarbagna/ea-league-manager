"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { completeSeason } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WarningNote } from "@/components/ui/warning-note";

export function EndSeasonDialog({
  seasonName,
  seasonId,
  totalFixtures,
  reportedFixtures,
}: {
  seasonName: string;
  seasonId: string;
  totalFixtures: number;
  reportedFixtures: number;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ error?: string }>({});
  const [pending, startTransition] = useTransition();

  const unreported = Math.max(0, totalFixtures - reportedFixtures);

  const handleConfirm = () => {
    setMessage({});
    startTransition(async () => {
      const result = await completeSeason(seasonId);
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
        <Button variant="destructive" size="sm">
          <Flag className="size-4" />
          End season
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,32rem)]">
        <DialogHeader>
          <DialogTitle>End {seasonName}?</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-3 text-sm text-on-surface-variant">
          <p>
            The current table becomes the final standings and {seasonName} moves
            to the Hall of Fame. There will be no active season until you
            activate another one.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{reportedFixtures} of {totalFixtures} fixtures reported.</li>
            {unreported > 0 && (
              <li>
                {unreported} unreported{" "}
                {unreported === 1 ? "fixture stays" : "fixtures stay"} unplayed
                and {unreported === 1 ? "does" : "do"} not count.
              </li>
            )}
            <li>Players lose access to reporting and the live table.</li>
          </ul>
        </div>

        {unreported > 0 && (
          <WarningNote tone="warn" className="mt-3">
            {unreported} {unreported === 1 ? "fixture is" : "fixtures are"} still
            unreported. Resolve any open disputes and no-shows first if those
            results should count.
          </WarningNote>
        )}

        {message.error && (
          <p className="mt-3 text-sm text-error">{message.error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "Ending…" : `End ${seasonName}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
