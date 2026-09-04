"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Gavel, XCircle } from "lucide-react";
import { resolveDispute } from "@/actions/admin";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { ScoreStepper } from "@/components/matches/score-stepper";
import { Button } from "@/components/ui/button";
import { WarningNote } from "@/components/ui/warning-note";
import { ResolverCard } from "@/components/admin/resolver-card";

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
    <ResolverCard
      tone="critical"
      kind="Dispute"
      matchweekNumber={matchweekNumber}
      busy={pending}
      summary={
        dispute.reason ? (
          <>Reason: {dispute.reason}</>
        ) : (
          <>
            <span className="text-on-surface">{disputerName}</span> disagrees with
            the score <span className="text-on-surface">{submitterName}</span>{" "}
            reported.
          </>
        )
      }
    >
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
          No counter score recorded (legacy entry). Set the final result below.
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
          {pendingAction === "approved"
            ? "Approving…"
            : "Approve original submission"}
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

      <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
        <p className="font-data text-[11px] uppercase tracking-widest text-primary">
          Override the result
        </p>
        <p className="mt-1 mb-4 text-sm text-on-surface-variant">
          Set the official score if it differs from both submissions.
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

        <WarningNote tone="warn" className="mt-4">
          Any of these actions completes the fixture and recalculates standings.
        </WarningNote>

        {message.error && (
          <p className="mt-4 text-sm text-error">{message.error}</p>
        )}

        <Button
          variant="secondary"
          className="mt-4 w-full"
          loading={pendingAction === "override"}
          disabled={pending}
          onClick={() => resolve("override")}
        >
          <Gavel className="size-4" />
          {pendingAction === "override" ? "Finalising…" : "Override & finalise"}
        </Button>
      </div>
    </ResolverCard>
  );
}
