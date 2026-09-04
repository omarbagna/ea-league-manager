import { Gavel } from "lucide-react";
import { EvidenceImagePreview } from "@/components/matches/evidence-image-preview";
import { MatchScoreStatus } from "@/components/matches/match-score-status";
import {
  teamNameForProfile,
  type ActiveDisputeContext,
} from "@/lib/queries/disputes";

export function DisputedMatchPanel({
  context,
  userId,
  submitterScreenshotUrl,
  counterScreenshotUrl,
}: {
  context: ActiveDisputeContext;
  userId: string;
  submitterScreenshotUrl?: string | null;
  counterScreenshotUrl?: string | null;
}) {
  const { dispute, submission, fixture } = context;
  const submitterName = teamNameForProfile(fixture, submission.submitted_by);
  const disputerName = teamNameForProfile(fixture, dispute.raised_by);

  const submitterScore = {
    homeScore: submission.home_score,
    awayScore: submission.away_score,
  };

  const counterScore =
    dispute.counter_home_score != null && dispute.counter_away_score != null
      ? {
          homeScore: dispute.counter_home_score,
          awayScore: dispute.counter_away_score,
        }
      : null;

  const isSubmitter = userId === submission.submitted_by;

  const yourScore = isSubmitter ? submitterScore : counterScore;
  const opponentScore = isSubmitter ? counterScore : submitterScore;
  const yourEvidenceUrl = isSubmitter ? submitterScreenshotUrl : counterScreenshotUrl;
  const opponentEvidenceUrl = isSubmitter ? counterScreenshotUrl : submitterScreenshotUrl;

  return (
    <section className="relative flex flex-col overflow-hidden rounded-xl border border-error/40 bg-card p-4 shadow-lg">
      <div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-error to-transparent opacity-60" />
      <div className="mb-4">
        <div className="mb-1 flex items-center gap-1 text-error">
          <Gavel className="size-4" />
          <h3 className="font-display text-lg font-semibold">Dispute Under Review</h3>
        </div>
        <p className="font-data text-xs text-outline">
          Matchweek {(fixture.matchweek as { number?: number })?.number ?? "—"} — an admin will
          decide the final result
        </p>
      </div>

      <MatchScoreStatus
        homeTeamName={fixture.home_team.name}
        awayTeamName={fixture.away_team.name}
        yourScore={yourScore}
        opponentScore={opponentScore}
        yourSubtitle={isSubmitter ? submitterName : disputerName}
        opponentSubtitle={isSubmitter ? disputerName : submitterName}
      />

      {dispute.reason && (
        <p className="mt-4 text-sm text-on-surface-variant">
          <span className="font-data text-xs uppercase text-outline">Dispute reason: </span>
          {dispute.reason}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EvidenceImagePreview
          src={yourEvidenceUrl}
          alt="Your match evidence"
          label="Your evidence"
        />
        <EvidenceImagePreview
          src={opponentEvidenceUrl}
          alt="Opponent match evidence"
          label="Opponent's evidence"
        />
      </div>

      <p className="mt-4 rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-center text-xs text-outline">
        Tap any image to view full size. Both screenshots are visible to league admins.
      </p>
    </section>
  );
}
