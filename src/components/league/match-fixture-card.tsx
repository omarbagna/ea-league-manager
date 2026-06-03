import Link from "next/link";
import { TeamCrest } from "@/components/league/team-crest";
import { formatWeekendRange } from "@/lib/format-weekend";
import { cn } from "@/lib/utils";
import type { FixtureWithTeams } from "@/types/database";

type MatchweekInfo = {
  starts_at?: string | null;
  ends_at?: string | null;
};

export function MatchFixtureCard({
  fixture,
  matchweek,
  showEaIds = true,
  linkToReport,
  highlightTeamId,
}: {
  fixture: FixtureWithTeams;
  matchweek?: MatchweekInfo;
  showEaIds?: boolean;
  linkToReport?: boolean;
  highlightTeamId?: string;
}) {
  const highlightHome = highlightTeamId === fixture.home_team_id;
  const highlightAway = highlightTeamId === fixture.away_team_id;
  const completed = fixture.status === "completed";
  const upcoming = !completed;
  const mw = matchweek ?? (fixture.matchweek as MatchweekInfo | undefined);
  const weekend = formatWeekendRange(mw?.starts_at, mw?.ends_at);

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-4 rounded-lg border border-outline-variant p-4 transition-colors md:flex-row",
        (highlightHome || highlightAway) && "border-primary-fixed/30 bg-primary-fixed/5",
        upcoming
          ? "cursor-pointer neon-glow-hover"
          : "hover:bg-surface-container-high",
        upcoming && !(highlightHome || highlightAway) && "bg-surface-container",
        !upcoming && "bg-surface-container-low"
      )}
    >
      <div className="flex w-full flex-1 items-center gap-3 md:justify-end">
        <span
          className={cn(
            "order-2 text-right font-display font-semibold md:order-1",
            highlightHome && "text-primary-fixed"
          )}
        >
          {fixture.home_team.name}
        </span>
        {showEaIds && fixture.home_team.profile?.ea_id && (
          <span className="order-3 hidden font-data text-[10px] text-outline md:block">
            {fixture.home_team.profile.ea_id}
          </span>
        )}
        <TeamCrest
          name={fixture.home_team.name}
          seed={fixture.home_team.crest_seed}
          crestUrl={fixture.home_team.crest_url}
          className="order-1 shrink-0 md:order-2"
          size="sm"
        />
      </div>

      <div className="flex min-w-[120px] flex-col items-center py-2 md:py-0">
        {completed ? (
          <>
            <span className="mb-1 font-data text-[10px] uppercase tracking-widest text-on-surface-variant">
              FT
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

      <div className="flex w-full flex-1 items-center gap-3">
        <TeamCrest
          name={fixture.away_team.name}
          seed={fixture.away_team.crest_seed}
          crestUrl={fixture.away_team.crest_url}
          size="sm"
        />
        <div className="flex flex-col">
          <span
            className={cn(
              "font-display font-semibold",
              highlightAway && "text-primary-fixed"
            )}
          >
            {fixture.away_team.name}
          </span>
          {showEaIds && fixture.away_team.profile?.ea_id && (
            <span className="font-data text-[10px] text-outline">
              {fixture.away_team.profile.ea_id}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (linkToReport && upcoming) {
    return (
      <Link href={`/matches/report?fixtureId=${fixture.id}`}>{content}</Link>
    );
  }
  return content;
}
