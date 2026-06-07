import { Hourglass } from "lucide-react";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";

export function AwaitingApprovalPanel({
  homeScore,
  awayScore,
  homeTeamName,
  awayTeamName,
  screenshotUrl,
}: {
  homeScore: number;
  awayScore: number;
  homeTeamName: string;
  awayTeamName: string;
  screenshotUrl?: string | null;
}) {
  return (
    <section className="relative flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-[#0f1115] p-4 shadow-lg">
      <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50" />
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-1 text-primary-fixed">
          <Hourglass className="size-4" />
          <h3 className="font-display text-lg font-semibold">Awaiting Opponent Approval</h3>
        </div>
        <p className="font-data text-xs text-outline">
          Your result is locked in until your opponent approves or disputes it. If they do
          not respond, a league admin can review and approve the report.
        </p>
      </div>

      <MatchScoreStatus
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        yourScore={{ homeScore, awayScore }}
        opponentScore={null}
      />

      <EvidenceImagePreview
        src={screenshotUrl}
        alt="Your match evidence"
        label="Your screenshot"
        emptyMessage="Screenshot no longer available."
        className="mt-4"
      />

      <p className="mt-4 rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-center text-xs text-outline">
        Opponent has not submitted a separate score. They will verify your submission.
      </p>
    </section>
  );
}
