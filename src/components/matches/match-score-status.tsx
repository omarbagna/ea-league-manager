import { cn } from "@/lib/utils";

type ScoreLine = {
  homeScore: number;
  awayScore: number;
};

function ScoreColumn({
  title,
  subtitle,
  score,
  homeTeamName,
  awayTeamName,
  highlight,
}: {
  title: string;
  subtitle?: string;
  score: ScoreLine | null;
  homeTeamName: string;
  awayTeamName: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-outline-variant/30 bg-surface-container-low p-4",
        highlight && "border-primary-container/40 ring-1 ring-primary-container/20"
      )}
    >
      <span className="mb-1 font-data text-[11px] uppercase tracking-widest text-outline">
        {title}
      </span>
      {subtitle && (
        <span className="mb-3 text-center text-xs text-on-surface-variant">{subtitle}</span>
      )}
      {!subtitle && <span className="mb-2 block" />}
      {score ? (
        <>
          <div className="mb-4 flex items-center justify-center gap-3 font-data text-4xl tracking-tighter text-primary">
            <span>{score.homeScore}</span>
            <span className="text-outline-variant">-</span>
            <span>{score.awayScore}</span>
          </div>
          <div className="flex w-full items-center justify-between gap-2 text-sm">
            <div className="flex flex-1 flex-col items-center text-center">
              <span className="font-data text-[11px] uppercase text-outline">Home</span>
              <span className="font-display font-semibold">{homeTeamName}</span>
            </div>
            <div className="h-8 w-px shrink-0 bg-outline-variant/30" />
            <div className="flex flex-1 flex-col items-center text-center">
              <span className="font-data text-[11px] uppercase text-outline">Away</span>
              <span className="font-display font-semibold">{awayTeamName}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-on-surface-variant">
          Not submitted yet
        </p>
      )}
    </div>
  );
}

export function MatchScoreStatus({
  homeTeamName,
  awayTeamName,
  yourScore,
  opponentScore,
  yourLabel = "Your submission",
  yourSubtitle,
  opponentLabel = "Opponent's submission",
  opponentSubtitle,
}: {
  homeTeamName: string;
  awayTeamName: string;
  yourScore: ScoreLine | null;
  opponentScore: ScoreLine | null;
  yourLabel?: string;
  yourSubtitle?: string;
  opponentLabel?: string;
  opponentSubtitle?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ScoreColumn
        title={yourLabel}
        subtitle={yourSubtitle}
        score={yourScore}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        highlight={!!yourScore}
      />
      <ScoreColumn
        title={opponentLabel}
        subtitle={opponentSubtitle}
        score={opponentScore}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        highlight={!!opponentScore}
      />
    </div>
  );
}
