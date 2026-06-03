"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { approveForfeitReport, rejectForfeitReport } from "@/actions/admin";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        "space-y-6 rounded-xl border border-outline-variant bg-surface-container-low p-4",
        pending && "pointer-events-none opacity-60"
      )}
      aria-busy={pending}
    >
      <div>
        <p className="font-data text-sm text-error">NO-SHOW FORFEIT</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          <span className="text-on-surface">{reporterTeamName}</span> reports{" "}
          <span className="text-on-surface">{absentTeamName}</span> did not show
        </p>
        {report.notes && (
          <p className="mt-2 text-sm text-on-surface-variant">
            Player notes: {report.notes}
          </p>
        )}
        <p className="mt-1 font-data text-xs text-outline">
          Matchweek {matchweekNumber ?? "—"}
        </p>
      </div>

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
        emptyMessage="Screenshot not available"
      />

      <label className="block">
        <span className="mb-1 block font-data text-xs uppercase tracking-widest text-outline">
          Admin notes (optional)
        </span>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={2}
          disabled={pending}
          className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
        />
      </label>

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
    </div>
  );
}
