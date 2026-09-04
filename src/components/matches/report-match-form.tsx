"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Send, Ticket } from "lucide-react";
import { submitMatchScore } from "@/actions/matches";
import { ScoreStepper } from "@/components/matches/score-stepper";
import { ScreenshotUpload } from "@/components/matches/screenshot-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { WarningNote } from "@/components/ui/warning-note";
import { TeamCrest } from "@/components/league/team-crest";
import { cn } from "@/lib/utils";
import type { FixtureWithTeams } from "@/types/database";

function TeamSide({
  label,
  team,
  copyEaId,
}: {
  label: string;
  team: FixtureWithTeams["home_team"];
  copyEaId?: boolean;
}) {
  const eaId = team.profile?.ea_id?.trim();
  return (
    <div className="flex items-center gap-2.5">
      <TeamCrest
        name={team.name}
        seed={team.crest_seed}
        crestUrl={team.crest_url}
        size="sm"
        className="size-9"
      />
      <div className="min-w-0">
        <span className="font-data text-[11px] uppercase tracking-wide text-outline">
          {label}
        </span>
        <p className="truncate font-display text-sm font-bold">{team.name}</p>
        {eaId ? (
          copyEaId ? (
            <CopyButton
              value={eaId}
              label={`EA: ${eaId}`}
              className="mt-0.5 px-1.5 py-0.5"
            />
          ) : (
            <span className="font-data text-[11px] text-on-surface-variant">
              EA: {eaId}
            </span>
          )
        ) : (
          <span className="font-data text-[11px] text-outline">EA ID not set</span>
        )}
      </div>
    </div>
  );
}

export function ReportMatchForm({
  fixture,
  userTeamId,
}: {
  fixture: FixtureWithTeams;
  userTeamId: string;
}) {
  const isHome = fixture.home_team_id === userTeamId;
  const myTeam = isHome ? fixture.home_team : fixture.away_team;
  const oppTeam = isHome ? fixture.away_team : fixture.home_team;

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  const myScore = isHome ? homeScore : awayScore;
  const oppScore = isHome ? awayScore : homeScore;
  const outcome =
    myScore > oppScore ? "win" : myScore === oppScore ? "draw" : "loss";
  const summary =
    outcome === "draw"
      ? `You're reporting a ${homeScore}–${awayScore} draw between ${myTeam.name} and ${oppTeam.name}.`
      : `You're reporting a ${homeScore}–${awayScore} ${outcome} for ${myTeam.name} against ${oppTeam.name}.`;

  const review = () => {
    if (!screenshotPath) {
      setMessage({ error: "Add a full-time screenshot first." });
      return;
    }
    setMessage({});
    setConfirming(true);
  };

  const submit = () => {
    if (!screenshotPath) return;
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
      } else {
        setConfirming(false);
      }
    });
  };

  return (
    <Card
      variant="outline"
      className={cn(
        "flex flex-col overflow-hidden",
        pending && "pointer-events-none opacity-60"
      )}
      aria-busy={pending}
    >
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 py-3">
        <div>
          <span className="inline-flex items-center gap-1.5 font-data text-[11px] uppercase tracking-widest text-primary">
            <Ticket className="size-3.5" />
            Match ticket
          </span>
          <p className="font-data text-[11px] text-outline">
            Matchweek {(fixture.matchweek as { number?: number })?.number ?? "—"}
          </p>
        </div>
        <span className="font-display text-sm italic text-outline-variant">
          {fixture.home_team.name.slice(0, 3).toUpperCase()} v{" "}
          {fixture.away_team.name.slice(0, 3).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col gap-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TeamSide label={isHome ? "You · Home" : "Home"} team={fixture.home_team} copyEaId={!isHome} />
          <TeamSide label={isHome ? "Away" : "You · Away"} team={fixture.away_team} copyEaId={isHome} />
        </div>

        {confirming ? (
          <div className="rounded-lg border border-primary-container/40 bg-primary-container/[0.06] p-4">
            <p className="font-data text-[11px] uppercase tracking-widest text-primary">
              Confirm
            </p>
            <p className="mt-2 text-on-surface">{summary}</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Your opponent still has to approve it. This can&apos;t be edited once
              they do.
            </p>
            {message.error && (
              <p className="mt-3 text-sm text-error">{message.error}</p>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                loading={pending}
                disabled={pending}
                onClick={submit}
              >
                <Send className="size-4" />
                {pending ? "Submitting…" : "Confirm & submit"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 font-data text-[11px] uppercase tracking-widest text-on-surface-variant">
                Final score
              </p>
              <div className="flex flex-col gap-3">
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
              </div>
            </div>

            <div>
              <ScreenshotUpload
                disabled={pending}
                onUploaded={(path) => {
                  setScreenshotPath(path);
                  setMessage({});
                }}
                onUploadError={(msg) => setMessage({ error: msg })}
                onCleared={() => setScreenshotPath(null)}
              />
              <p className="mt-1.5 font-data text-[11px] text-outline">
                Capture the full-time screen showing both team names and the final
                score.
              </p>
            </div>

            <WarningNote tone="critical">
              Enter the <strong>exact</strong> final score. Falsifying a result is
              an immediate league ban. The screenshot is deleted once the result is
              finalised.
            </WarningNote>

            {message.error && (
              <p className="text-sm text-error">{message.error}</p>
            )}
            {message.success && (
              <p className="text-sm text-secondary-fixed">{message.success}</p>
            )}

            <Button
              className="w-full"
              disabled={pending || !screenshotPath}
              onClick={review}
            >
              Review submission
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
