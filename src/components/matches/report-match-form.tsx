"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { submitMatchScore } from "@/actions/matches";
import { ScoreStepper } from "@/components/matches/score-stepper";
import { ScreenshotUpload } from "@/components/matches/screenshot-upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FixtureWithTeams } from "@/types/database";

export function ReportMatchForm({
  fixture,
  userTeamId,
}: {
  fixture: FixtureWithTeams;
  userTeamId: string;
}) {
  const isHome = fixture.home_team_id === userTeamId;
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!screenshotPath) {
      setMessage({ error: "Screenshot is required." });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("fixtureId", fixture.id);
      fd.set("homeScore", String(homeScore));
      fd.set("awayScore", String(awayScore));
      fd.set("screenshotPath", screenshotPath);
      const result = await submitMatchScore({}, fd);
      setMessage(result);
      if (result.success) {
        window.location.reload();
      }
    });
  };

  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-card p-4 shadow-lg",
        pending && "pointer-events-none opacity-60"
      )}
      aria-busy={pending}
    >
      <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />
      <div className="mb-4 flex justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-on-surface">Submit Final Score</h3>
          <p className="font-data text-xs text-outline">
            Matchweek {(fixture.matchweek as { number?: number })?.number ?? "—"}
          </p>
        </div>
        <span className="rounded border border-outline-variant bg-surface px-2 py-1 font-data text-xs text-primary-fixed">
          VS
        </span>
      </div>

      <p className="mb-4 text-sm text-on-surface-variant">
        Ensure scores are entered correctly. Falsifying match results will result in an
        immediate league ban. Screenshots are deleted once the result is finalized.
      </p>

      <div className="flex flex-col gap-4">
        <ScoreStepper
          value={homeScore}
          onChange={setHomeScore}
          label="Home"
          teamName={fixture.home_team.name}
          eaId={fixture.home_team.profile?.ea_id}
          isHome={isHome}
        />
        <ScoreStepper
          value={awayScore}
          onChange={setAwayScore}
          label="Away"
          teamName={fixture.away_team.name}
          eaId={fixture.away_team.profile?.ea_id}
        />
        <ScreenshotUpload
          disabled={pending}
          onUploaded={(path) => {
            setScreenshotPath(path);
            setMessage({});
          }}
          onUploadError={(msg) => setMessage({ error: msg })}
          onCleared={() => setScreenshotPath(null)}
        />
      </div>

      {message.error && (
        <p className="mt-2 text-sm text-error">{message.error}</p>
      )}
      {message.success && (
        <p className="mt-2 text-sm text-secondary-fixed">{message.success}</p>
      )}

      <div className="mt-6 border-t border-outline-variant/30 pt-4">
        <Button
          variant="secondary"
          className="w-full"
          loading={pending}
          disabled={pending || !screenshotPath}
          onClick={handleSubmit}
        >
          <Send className="size-4" />
          {pending ? "Submitting…" : "Submit Official Score"}
        </Button>
      </div>
    </section>
  );
}
