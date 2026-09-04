"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Gavel, XCircle } from "lucide-react";
import { resolveDispute } from "@/actions/admin";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { ScoreStepper } from "@/components/matches/score-stepper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScoreLine = { homeScore: number; awayScore: number };

export function DisputeResolver({
  dispute,
  homeName,
  awayName,
  homeEaId,
  awayEaId,
  matchweekNumber,
  submitterName,
  disputerName,
  submitterScore,
  counterScore,
  submitterScreenshotUrl,
  counterScreenshotUrl,
}: {
  dispute: { id: string; reason: string | null };
  homeName: string;
  awayName: string;
  homeEaId?: string | null;
  awayEaId?: string | null;
  matchweekNumber?: number | null;
  submitterName: string;
  disputerName: string;
  submitterScore: ScoreLine;
  counterScore: ScoreLine | null;
  submitterScreenshotUrl: string | null;
  counterScreenshotUrl: string | null;
}) {
  const [pendingAction, setPendingAction] = useState<
    "approved" | "rejected" | "override" | null
  >(null);
  const [, startTransition] = useTransition();
  const [overrideHome, setOverrideHome] = useState(submitterScore.homeScore);
  const [overrideAway, setOverrideAway] = useState(submitterScore.awayScore);
  const [message, setMessage] = useState<{ error?: string }>({});
  const pending = pendingAction !== null;

  const resolve = (resolution: "approved" | "rejected" | "override") => {
    setMessage({});
    setPendingAction(resolution);
    startTransition(async () => {
      const result = await resolveDispute(
        dispute.id,
        resolution,
        resolution === "override" ? overrideHome : undefined,
        resolution === "override" ? overrideAway : undefined
      );
      if (result.error) {
        setMessage({ error: result.error });
        setPendingAction(null);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <div
      className={cn(
        "space-y-6 rounded-xl border border-outline-variant bg-surface-container-low p-4",
        pending && "pointer-events-none opacity-60"
      )}
      aria-busy={pending}
    >
      <div>
        <p className="font-data text-sm text-error">DISPUTE</p>
        {dispute.reason && (
          <p className="mt-1 text-sm text-on-surface-variant">Reason: {dispute.reason}</p>
        )}
      </div>

      <MatchScoreStatus
        homeTeamName={homeName}
        awayTeamName={awayName}
        yourScore={submitterScore}
        opponentScore={counterScore}
        yourLabel="Original submission"
        yourSubtitle={submitterName}
        opponentLabel="Counter claim"
        opponentSubtitle={disputerName}
      />

      {!counterScore && (
        <p className="text-sm text-on-surface-variant">
          No counter score recorded for this dispute (legacy entry). Set the final result below.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EvidenceImagePreview
          src={submitterScreenshotUrl}
          alt="Submitter evidence"
          label={`${submitterName} — original submission`}
        />
        <EvidenceImagePreview
          src={counterScreenshotUrl}
          alt="Disputer evidence"
          label={`${disputerName} — dispute evidence`}
          emptyMessage={
            counterScore
              ? "Screenshot not available"
              : "No dispute screenshot (legacy dispute)"
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          loading={pendingAction === "approved"}
          disabled={pending}
          onClick={() => resolve("approved")}
        >
          <CheckCircle className="size-4" />
          {pendingAction === "approved" ? "Approving…" : "Approve original submission"}
        </Button>
        <Button
          variant="destructive"
          loading={pendingAction === "rejected"}
          disabled={pending}
          onClick={() => resolve("rejected")}
        >
          <XCircle className="size-4" />
          {pendingAction === "rejected" ? "Rejecting…" : "Reject both"}
        </Button>
      </div>

      <section className="relative flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-card p-4 shadow-lg">
        <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />
        <div className="mb-4 flex justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-on-surface">
              Finalize Result
            </h3>
            <p className="font-data text-xs text-outline">
              Matchweek {matchweekNumber ?? "—"}
            </p>
          </div>
          <span className="rounded border border-outline-variant bg-surface px-2 py-1 font-data text-xs text-primary-fixed">
            VS
          </span>
        </div>

        <p className="mb-4 text-sm text-on-surface-variant">
          Set the official score if it differs from both submissions. This completes the
          fixture and updates standings.
        </p>

        <div className="flex flex-col gap-4">
          <ScoreStepper
            value={overrideHome}
            onChange={setOverrideHome}
            label="Home"
            teamName={homeName}
            eaId={homeEaId}
          />
          <ScoreStepper
            value={overrideAway}
            onChange={setOverrideAway}
            label="Away"
            teamName={awayName}
            eaId={awayEaId}
          />
        </div>

        {message.error && (
          <p className="mt-4 text-sm text-error">{message.error}</p>
        )}

        <div className="mt-6 border-t border-outline-variant/30 pt-4">
          <Button
            variant="secondary"
            className="w-full"
            loading={pendingAction === "override"}
            disabled={pending}
            onClick={() => resolve("override")}
          >
            <Gavel className="size-4" />
            {pendingAction === "override" ? "Finalizing…" : "Override & Finalize"}
          </Button>
        </div>
      </section>
    </div>
  );
}
