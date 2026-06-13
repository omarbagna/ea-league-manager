import Link from "next/link";
import { TeamCrest } from "@/components/league/team-crest";
import { formatWeekendRange } from "@/lib/format-weekend";
import { isMatchweekEnded } from "@/lib/forfeit-eligibility";
import { cn } from "@/lib/utils";
import type { FixtureWithTeams } from "@/types/database";
import type { ReactNode } from "react";

type MatchweekInfo = {
  starts_at?: string | null;
  ends_at?: string | null;
};

function formatEaId(eaId: string | null | undefined): string {
  return eaId?.trim() || "—";
}

function TeamBlock({
  name,
  eaId,
  crestSeed,
  crestUrl,
  highlighted,
  align = "start",
}: {
  name: string;
  eaId: string | null | undefined;
  crestSeed: string | null;
  crestUrl: string | null;
  highlighted?: boolean;
  align?: "start" | "end";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        align === "end" && "flex-row-reverse md:flex-row"
      )}
    >
      <TeamCrest
        name={name}
        seed={crestSeed}
        crestUrl={crestUrl}
        className="shrink-0"
        size="sm"
      />
      <div className={cn("flex flex-col", align === "end" && "items-end md:items-start")}>
        <span
          className={cn(
            "font-display font-semibold",
            highlighted && "text-primary-fixed"
          )}
        >
          {name}
        </span>
        <span className="font-data text-[10px] text-outline">{formatEaId(eaId)}</span>
      </div>
    </div>
  );
}

export function MatchFixtureCard({
  fixture,
  matchweek,
  linkToReport,
  highlightTeamId,
  userProfileId,
  footer,
}: {
  fixture: FixtureWithTeams;
  matchweek?: MatchweekInfo;
  linkToReport?: boolean;
  highlightTeamId?: string;
  userProfileId?: string;
  footer?: ReactNode;
}) {
  const highlightHome = highlightTeamId === fixture.home_team_id;
  const highlightAway = highlightTeamId === fixture.away_team_id;
  const completed = fixture.status === "completed";
  const upcoming = !completed;
  const interactive = linkToReport && upcoming;
  const mw = matchweek ?? (fixture.matchweek as MatchweekInfo | undefined);
  const weekend = formatWeekendRange(mw?.starts_at, mw?.ends_at);
  const isParticipant =
    !!userProfileId &&
    (fixture.home_team.profile_id === userProfileId ||
      fixture.away_team.profile_id === userProfileId);
  const showNoShowLink =
    upcoming && isParticipant && isMatchweekEnded(mw?.ends_at);
  const isForfeit = completed && !!fixture.forfeited_team_id;

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-4 rounded-lg border border-outline-variant p-4 transition-colors md:flex-row",
        (highlightHome || highlightAway) && "border-primary-fixed/30 bg-primary-fixed/5",
        interactive && "cursor-pointer neon-glow-hover",
        !interactive && !completed && "hover:bg-surface-container-high",
        upcoming && !(highlightHome || highlightAway) && "bg-surface-container",
        !upcoming && "bg-surface-container-low"
      )}
    >
      <div className="flex w-full flex-1 md:justify-end">
        <TeamBlock
          name={fixture.home_team.name}
          eaId={fixture.home_team.profile?.ea_id}
          crestSeed={fixture.home_team.crest_seed}
          crestUrl={fixture.home_team.crest_url}
          highlighted={highlightHome}
          align="end"
        />
      </div>

      <div className="flex min-w-[120px] flex-col items-center py-2 md:py-0">
        {completed ? (
          <>
            <span className="mb-1 font-data text-[10px] uppercase tracking-widest text-on-surface-variant">
              FT{isForfeit ? " · Forfeit" : ""}
            </span>
            <div className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1 neon-glow-active">
              <span className="font-data text-2xl font-bold tracking-widest text-secondary-fixed">
                {fixture.home_score}
                <span className="mx-1 text-outline-variant">-</span>
                {fixture.away_score}
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="mb-1 font-data text-[10px] uppercase tracking-widest text-primary animate-pulse">
              {fixture.status === "in_progress" ? "Live" : "Upcoming"}
            </span>
            <span className="font-data text-sm font-bold text-on-surface-variant">
              {weekend ?? "Weekend TBD"}
            </span>
          </>
        )}
      </div>

      <div className="flex w-full flex-1">
        <TeamBlock
          name={fixture.away_team.name}
          eaId={fixture.away_team.profile?.ea_id}
          crestSeed={fixture.away_team.crest_seed}
          crestUrl={fixture.away_team.crest_url}
          highlighted={highlightAway}
        />
      </div>
    </div>
  );

  const cardBody =
    interactive ? (
      <Link href={`/matches/report?fixtureId=${fixture.id}`}>{content}</Link>
    ) : (
      content
    );

  if (footer || (interactive && showNoShowLink)) {
    return (
      <div className="flex flex-col gap-2">
        {cardBody}
        {footer}
        {interactive && showNoShowLink && (
          <Link
            href={`/matches/report?fixtureId=${fixture.id}`}
            className="text-center font-data text-xs uppercase tracking-widest text-error hover:underline"
          >
            Report opponent no-show
          </Link>
        )}
      </div>
    );
  }

  return content;
}
