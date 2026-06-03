"use client";

import { useState, useTransition } from "react";
import { Gavel, CheckCircle, Hourglass } from "lucide-react";
import { approveSubmission, disputeSubmission, uploadScreenshot } from "@/actions/matches";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { ScreenshotUpload } from "@/components/matches/screenshot-upload";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import { ScoreStepper } from "@/components/matches/score-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FixtureWithTeams } from "@/types/database";

export function PendingApprovalPanel({
  submissionId,
  homeScore,
  awayScore,
  homeTeamName,
  awayTeamName,
  fixture,
  userTeamId,
  screenshotUrl,
}: {
  submissionId: string;
  homeScore: number;
  awayScore: number;
  homeTeamName: string;
  awayTeamName: string;
  fixture: FixtureWithTeams;
  userTeamId: string;
  screenshotUrl?: string | null;
}) {
  const isHome = fixture.home_team_id === userTeamId;
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [counterHome, setCounterHome] = useState(homeScore);
  const [counterAway, setCounterAway] = useState(awayScore);
  const [disputeReason, setDisputeReason] = useState("");
  const [counterScreenshotPath, setCounterScreenshotPath] = useState<string | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "dispute" | null>(
    null
  );
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [, startTransition] = useTransition();
  const pending = pendingAction !== null;
  const isBusy = pending || uploading;

  const handleDisputeScreenshot = async (file: File | null) => {
    if (!file) {
      setCounterScreenshotPath(null);
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadScreenshot(fd);
    setUploading(false);
    if (result.error) {
      setMessage({ error: result.error });
      setCounterScreenshotPath(null);
    } else {
      setCounterScreenshotPath(result.path ?? null);
    }
  };

  const handleApprove = () => {
    setMessage({});
    setPendingAction("approve");
    startTransition(async () => {
      const result = await approveSubmission(submissionId);
      if (result.error) {
        setMessage({ error: result.error });
        setPendingAction(null);
        return;
      }
      window.location.reload();
    });
  };

  const handleDispute = () => {
    if (!counterScreenshotPath) {
      setMessage({ error: "Screenshot is required for a dispute." });
      return;
    }
    setMessage({});
    setPendingAction("dispute");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("submissionId", submissionId);
      fd.set("homeScore", String(counterHome));
      fd.set("awayScore", String(counterAway));
      fd.set("screenshotPath", counterScreenshotPath);
      if (disputeReason.trim()) fd.set("reason", disputeReason.trim());
      const result = await disputeSubmission({}, fd);
      if (result.error) {
        setMessage({ error: result.error });
        setPendingAction(null);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-[#0f1115] p-4 shadow-lg",
        isBusy && "pointer-events-none opacity-60"
      )}
      aria-busy={isBusy}
    >
      <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-error to-transparent opacity-50" />
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-1 text-error">
          <Hourglass className="size-4" />
          <h3 className="font-display text-lg font-semibold">Pending Your Approval</h3>
        </div>
        <p className="font-data text-xs text-outline">Verify the submitted result below</p>
      </div>

      <MatchScoreStatus
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        yourScore={null}
        opponentScore={{ homeScore, awayScore }}
        opponentLabel="Opponent's submission"
      />

      <div className="mt-4 flex flex-col gap-4">
        <EvidenceImagePreview
          src={screenshotUrl}
          alt="Opponent match evidence"
          label="Opponent's screenshot"
          emptyMessage="Screenshot no longer available."
        />
        <p className="rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-xs text-outline">
          Score submitted by opponent. Approve if correct, or dispute with your result.
        </p>
      </div>

      {showDisputeForm && (
        <div className="mt-4 space-y-4 rounded-lg border border-error/30 bg-surface-container-low p-4">
          <p className="text-sm font-medium text-on-surface">
            Enter the score you believe is correct and upload your own screenshot
          </p>
          <ScoreStepper
            value={counterHome}
            onChange={setCounterHome}
            label="Home"
            teamName={fixture.home_team.name}
            eaId={fixture.home_team.profile?.ea_id}
            isHome={isHome}
          />
          <ScoreStepper
            value={counterAway}
            onChange={setCounterAway}
            label="Away"
            teamName={fixture.away_team.name}
            eaId={fixture.away_team.profile?.ea_id}
            isHome={!isHome}
          />
          <ScreenshotUpload
            onFileSelect={handleDisputeScreenshot}
            disabled={pending}
            uploading={uploading}
          />
          <div>
            <Label htmlFor="disputeReason" className="text-xs uppercase">
              Reason (optional)
            </Label>
            <Input
              id="disputeReason"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Why you disagree"
              className="mt-1"
              disabled={pending}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setShowDisputeForm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={pendingAction === "dispute"}
              disabled={isBusy || !counterScreenshotPath}
              onClick={handleDispute}
            >
              {pendingAction === "dispute" ? "Submitting…" : "Submit dispute"}
            </Button>
          </div>
        </div>
      )}

      {message.error && (
        <p className="mt-4 rounded-lg border border-error px-3 py-2 text-sm text-error">
          {message.error}
        </p>
      )}

      {!showDisputeForm && (
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-outline-variant/30 pt-4">
          <Button
            variant="destructive"
            size="lg"
            disabled={pending}
            onClick={() => setShowDisputeForm(true)}
          >
            <Gavel className="size-5" />
            Dispute
          </Button>
          <Button
            variant="secondary"
            size="lg"
            loading={pendingAction === "approve"}
            disabled={pending}
            onClick={handleApprove}
          >
            <CheckCircle className="size-5" />
            {pendingAction === "approve" ? "Approving…" : "Approve Result"}
          </Button>
        </div>
      )}
    </section>
  );
}
