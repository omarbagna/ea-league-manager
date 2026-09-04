import { Hourglass } from "lucide-react";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";

export function ForfeitAwaitingPanel({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  absentTeamName,
  screenshotUrl,
}: {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  absentTeamName: string;
  screenshotUrl?: string | null;
}) {
  return (
    <section className="relative flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-card p-4 shadow-lg">
      <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-error to-transparent opacity-50" />
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-1 text-error">
          <Hourglass className="size-4" />
          <h3 className="font-display text-lg font-semibold">No-Show Under Admin Review</h3>
        </div>
        <p className="font-data text-xs text-outline">
          You reported that {absentTeamName} did not show for this match
        </p>
      </div>

      <MatchScoreStatus
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        yourScore={{ homeScore, awayScore }}
        opponentScore={null}
        yourLabel="If approved"
      />

      <EvidenceImagePreview
        src={screenshotUrl}
        alt="No-show evidence"
        label="Your evidence"
        emptyMessage="No screenshot provided."
        className="mt-4"
      />

      <p className="mt-4 rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-center text-xs text-outline">
        An admin will approve or reject your 3–0 forfeit request.
      </p>
    </section>
  );
}
