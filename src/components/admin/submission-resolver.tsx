"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "lucide-react";
import { adminApproveSubmission } from "@/actions/admin";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MatchSubmission } from "@/types/database";

export function SubmissionResolver({
  submission,
  homeName,
  awayName,
  matchweekNumber,
  submitterName,
  opponentName,
  screenshotUrl,
}: {
  submission: MatchSubmission;
  homeName: string;
  awayName: string;
  matchweekNumber?: number | null;
  submitterName: string;
  opponentName: string;
  screenshotUrl: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string }>({});

  const handleApprove = () => {
    setMessage({});
    startTransition(async () => {
      const result = await adminApproveSubmission(submission.id);
      if (result.error) {
        setMessage({ error: result.error });
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
        <p className="font-data text-sm text-primary">PENDING REPORT</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          <span className="text-on-surface">{submitterName}</span> submitted a result;
          awaiting approval from{" "}
          <span className="text-on-surface">{opponentName}</span>
        </p>
        <p className="mt-1 font-data text-xs text-outline">
          Matchweek {matchweekNumber ?? "—"}
        </p>
      </div>

      <MatchScoreStatus
        homeTeamName={homeName}
        awayTeamName={awayName}
        yourScore={{
          homeScore: submission.home_score,
          awayScore: submission.away_score,
        }}
        opponentScore={null}
        yourLabel="Submitted score"
        yourSubtitle={submitterName}
      />

      <EvidenceImagePreview
        src={screenshotUrl}
        alt="Match evidence"
        label={`${submitterName} — evidence`}
        emptyMessage="Screenshot not available"
      />

      {message.error && <p className="text-sm text-error">{message.error}</p>}

      <Button
        variant="secondary"
        loading={pending}
        disabled={pending}
        onClick={handleApprove}
      >
        <CheckCircle className="size-4" />
        {pending ? "Approving…" : "Approve & Finalize"}
      </Button>
    </div>
  );
}
