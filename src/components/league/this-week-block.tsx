import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Card } from "@/components/ui/card";
import { TeamCrest } from "@/components/league/team-crest";
import { FormRun } from "@/components/league/standings-table";
import { MatchweekCountdown } from "@/components/league/matchweek-countdown";
import type { MatchResult } from "@/lib/standings";

type TeamLite = {
  id: string;
  name: string;
  crestSeed: string | null;
  crestUrl: string | null;
};

export function ThisWeekBlock({
  fixtureId,
  matchweekNumber,
  weekendRange,
  endsAt,
  matchweekEnded,
  myTeam,
  opponent,
  opponentEaId,
  opponentForm,
  forfeitEligible,
}: {
  fixtureId: string;
  matchweekNumber: number | string;
  weekendRange: string | null;
  endsAt: string | null | undefined;
  matchweekEnded: boolean;
  myTeam: TeamLite;
  opponent: TeamLite;
  opponentEaId: string | null;
  opponentForm: MatchResult[];
  forfeitEligible: boolean;
}) {
  const reportHref = `/matches/report?fixtureId=${fixtureId}`;

  return (
    <Card variant="accent" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/60 bg-surface-container-low px-5 py-3">
        <span className="inline-flex items-center gap-1.5 font-data text-xs uppercase tracking-widest text-primary">
          <CalendarDays className="size-3.5" />
          {/* "This week" framing only makes sense while the window's still
              open — paired with the countdown's "Matchweek ended" once it
              closes, it read as contradicting itself. */}
          {matchweekEnded
            ? `Matchweek ${matchweekNumber}`
            : `This week · Matchweek ${matchweekNumber}`}
          {weekendRange ? ` · ${weekendRange}` : ""}
        </span>
        <MatchweekCountdown endsAt={endsAt} />
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <Link
          href={`/teams/${myTeam.id}`}
          className="flex items-center gap-3 hover:text-primary"
        >
          <TeamCrest
            name={myTeam.name}
            seed={myTeam.crestSeed}
            crestUrl={myTeam.crestUrl}
            size="md"
          />
          <div>
            <span className="font-data text-[11px] uppercase tracking-wide text-outline">
              You
            </span>
            <p className="font-display text-lg font-bold leading-tight">
              {myTeam.name}
            </p>
          </div>
        </Link>

        <span className="hidden font-display text-sm italic text-outline-variant md:block">
          vs
        </span>

        <div className="flex items-center gap-3 md:justify-end md:text-right">
          <Link href={`/teams/${opponent.id}`} className="md:order-2">
            <TeamCrest
              name={opponent.name}
              seed={opponent.crestSeed}
              crestUrl={opponent.crestUrl}
              size="md"
            />
          </Link>
          <div className="md:order-1">
            <span className="font-data text-[11px] uppercase tracking-wide text-outline">
              Opponent
            </span>
            <Link
              href={`/teams/${opponent.id}`}
              className="block font-display text-lg font-bold leading-tight hover:text-primary"
            >
              {opponent.name}
            </Link>
            <div className="mt-1.5 flex items-center gap-2 md:justify-end">
              <FormRun form={opponentForm} />
            </div>
            <div className="mt-2 flex md:justify-end">
              {opponentEaId ? (
                <CopyButton value={opponentEaId} label={`EA: ${opponentEaId}`} />
              ) : (
                <span className="font-data text-xs text-outline-variant">
                  EA ID not set
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-outline-variant/60 px-5 py-4">
        <Link href={reportHref}>
          <Button>Report result</Button>
        </Link>
        {forfeitEligible && (
          <Link
            href={reportHref}
            className="font-data text-xs uppercase tracking-widest text-error hover:underline"
          >
            Opponent no-show? Report it instead
          </Link>
        )}
        <Link
          href="/matches/report"
          className="font-data text-xs text-on-surface-variant hover:text-primary hover:underline"
        >
          All matchweek fixtures →
        </Link>
        {matchweekEnded && !forfeitEligible && (
          <p className="w-full font-data text-xs text-on-surface-variant">
            Matchweek ended — head to the reporting hub if you need to dispute a
            result.
          </p>
        )}
      </div>
    </Card>
  );
}
