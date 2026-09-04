"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { approveForfeitReport, rejectForfeitReport } from "@/actions/admin";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WarningNote } from "@/components/ui/warning-note";
import { ResolverCard } from "@/components/admin/resolver-card";
import type { ForfeitReport } from "@/types/database";

export function ForfeitResolver({
  report,
  homeName,
  awayName,
  matchweekNumber,
  reporterTeamName,
  absentTeamName,
  previewScore,
  screenshotUrl,
}: {
  report: ForfeitReport;
  homeName: string;
  awayName: string;
  matchweekNumber?: number | null;
  reporterTeamName: string;
  absentTeamName: string;
  previewScore: { homeScore: number; awayScore: number };
  screenshotUrl: string | null;
}) {
  const [pendingAction, setPendingAction] = useState<"approved" | "rejected" | null>(null);
  const [, startTransition] = useTransition();
  const [adminNotes, setAdminNotes] = useState("");
  const [message, setMessage] = useState<{ error?: string }>({});
  const pending = pendingAction !== null;

  const resolve = (action: "approved" | "rejected") => {
    setMessage({});
    setPendingAction(action);
    startTransition(async () => {
      const result =
        action === "approved"
          ? await approveForfeitReport(report.id, adminNotes.trim() || undefined)
          : await rejectForfeitReport(report.id, adminNotes.trim() || undefined);
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
      kind="No-show"
      matchweekNumber={matchweekNumber}
      busy={pending}
      summary={
        <>
          <span className="text-on-surface">{reporterTeamName}</span> reports that{" "}
          <span className="text-on-surface">{absentTeamName}</span> did not show.
          {report.notes ? ` Player notes: ${report.notes}` : ""}
        </>
      }
    >
      <MatchScoreStatus
        homeTeamName={homeName}
        awayTeamName={awayName}
        yourScore={previewScore}
        opponentScore={null}
        yourLabel="If approved (forfeit)"
        yourSubtitle={reporterTeamName}
        opponentLabel="Absent team"
        opponentSubtitle={absentTeamName}
      />

      <EvidenceImagePreview
        src={screenshotUrl}
        alt="No-show evidence"
        label={`${reporterTeamName} — evidence`}
        emptyMessage="No screenshot provided."
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`forfeit-notes-${report.id}`}>Admin notes (optional)</Label>
        <textarea
          id={`forfeit-notes-${report.id}`}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={2}
          disabled={pending}
          className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:border-primary-container focus:outline-none"
        />
      </div>

      <WarningNote tone="warn">
        Approving records a 3–0 win for {reporterTeamName} and updates standings.
      </WarningNote>

      {message.error && <p className="text-sm text-error">{message.error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          loading={pendingAction === "approved"}
          disabled={pending}
          onClick={() => resolve("approved")}
        >
          <CheckCircle className="size-4" />
          {pendingAction === "approved" ? "Approving…" : "Approve forfeit (3–0)"}
        </Button>
        <Button
          variant="destructive"
          loading={pendingAction === "rejected"}
          disabled={pending}
          onClick={() => resolve("rejected")}
        >
          <XCircle className="size-4" />
          {pendingAction === "rejected" ? "Rejecting…" : "Reject report"}
        </Button>
      </div>
    </ResolverCard>
  );
}
