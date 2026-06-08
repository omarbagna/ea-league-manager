"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { adminMarkFixtureForfeit } from "@/actions/admin";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { forfeitScoresForAbsentTeam } from "@/lib/forfeit-eligibility";
import { cn } from "@/lib/utils";
import type { FixtureWithTeams } from "@/types/database";

export function AdminFixtureForfeitDialog({
  fixture,
}: {
  fixture: FixtureWithTeams;
}) {
  const [open, setOpen] = useState(false);
  const [absentTeamId, setAbsentTeamId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [message, setMessage] = useState<{ error?: string }>({});
  const [pending, startTransition] = useTransition();

  const previewScore =
    absentTeamId != null
      ? forfeitScoresForAbsentTeam(
          fixture.home_team_id,
          fixture.away_team_id,
          absentTeamId
        )
      : null;

  const absentTeamName =
    absentTeamId === fixture.home_team_id
      ? fixture.home_team.name
      : absentTeamId === fixture.away_team_id
        ? fixture.away_team.name
        : null;

  const handleConfirm = () => {
    if (!absentTeamId) {
      setMessage({ error: "Select which team did not show." });
      return;
    }
    setMessage({});
    startTransition(async () => {
      const result = await adminMarkFixtureForfeit(
        fixture.id,
        absentTeamId,
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
          setAbsentTeamId(null);
          setAdminNotes("");
          setMessage({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full font-data text-xs uppercase tracking-widest text-error hover:bg-error/10 hover:text-error"
        >
          <AlertTriangle className="size-3.5" />
          Mark no-show
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,32rem)]">
        <DialogHeader>
          <DialogTitle>Record no-show forfeit</DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            "space-y-4",
            pending && "pointer-events-none opacity-60"
          )}
          aria-busy={pending}
        >
          <p className="text-sm text-on-surface-variant">
            {fixture.home_team.name} vs {fixture.away_team.name} — select the team
            that did not show. The match will be finalized as a 3–0 forfeit.
          </p>

          <fieldset className="space-y-2">
            <legend className="mb-2 font-data text-xs uppercase tracking-widest text-outline">
              Absent team
            </legend>
            {[fixture.home_team, fixture.away_team].map((team) => (
              <label
                key={team.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant px-3 py-2 transition-colors",
                  absentTeamId === team.id && "border-error/50 bg-error/5"
                )}
              >
                <input
                  type="radio"
                  name={`absent-${fixture.id}`}
                  value={team.id}
                  checked={absentTeamId === team.id}
                  disabled={pending}
                  onChange={() => {
                    setAbsentTeamId(team.id);
                    setMessage({});
                  }}
                  className="accent-error"
                />
                <span className="font-display font-semibold">{team.name}</span>
              </label>
            ))}
          </fieldset>

          {previewScore && absentTeamName && (
            <MatchScoreStatus
              homeTeamName={fixture.home_team.name}
              awayTeamName={fixture.away_team.name}
              yourScore={previewScore}
              opponentScore={null}
              yourLabel="Result"
              yourSubtitle={`${absentTeamName} no-show`}
            />
          )}

          <label className="block">
            <span className="mb-1 block font-data text-xs uppercase tracking-widest text-outline">
              Admin notes (optional)
            </span>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              disabled={pending}
              maxLength={500}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            />
          </label>

          {message.error && <p className="text-sm text-error">{message.error}</p>}

          <Button
            variant="secondary"
            className="w-full"
            loading={pending}
            disabled={pending || !absentTeamId}
            onClick={handleConfirm}
          >
            {pending ? "Recording…" : "Record forfeit (3–0)"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
