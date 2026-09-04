"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "lucide-react";
import { adminApproveSubmission } from "@/actions/admin";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { Button } from "@/components/ui/button";
import { WarningNote } from "@/components/ui/warning-note";
import { ResolverCard } from "@/components/admin/resolver-card";
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
    <ResolverCard
      tone="pending"
      kind="Pending report"
      matchweekNumber={matchweekNumber}
      busy={pending}
      summary={
        <>
          <span className="text-on-surface">{submitterName}</span> submitted a
          result; <span className="text-on-surface">{opponentName}</span> hasn
          &apos;t approved it.
        </>
      }
    >
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

      <WarningNote tone="warn">
        Approving finalises the fixture and recalculates standings. It can only
        be undone with an admin revert within 24 hours.
      </WarningNote>

      {message.error && <p className="text-sm text-error">{message.error}</p>}

      <Button
        variant="secondary"
        loading={pending}
        disabled={pending}
        onClick={handleApprove}
      >
        <CheckCircle className="size-4" />
        {pending ? "Approving…" : "Approve & finalise"}
      </Button>
    </ResolverCard>
  );
}
