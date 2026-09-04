import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMatchCentre } from "@/lib/queries/match-centre";
import type { MatchCentreTeam, RecentResult } from "@/lib/queries/match-centre";
import type { MatchResult } from "@/lib/standings";
import { TeamCrest } from "@/components/league/team-crest";
import { CountUpScore } from "@/components/league/count-up-score";
import { FormRun } from "@/components/league/standings-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RESULT_TAG: Record<MatchResult, string> = {
  W: "border-secondary-fixed/40 bg-secondary-fixed/12 text-secondary-fixed",
  D: "border-outline-variant bg-surface-container-highest text-on-surface-variant",
  L: "border-error/45 bg-error/12 text-error",
};

function ResultTag({ r }: { r: MatchResult }) {
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded border font-data text-[10px] font-bold",
        RESULT_TAG[r]
      )}
    >
      {r}
    </span>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function TeamHead({
  team,
  align,
}: {
  team: MatchCentreTeam;
  align: "left" | "right";
}) {
  return (
    <Link
      href={`/teams/${team.id}`}
      className={cn(
        "flex flex-1 items-center gap-3 transition-colors hover:text-primary",
        align === "right" && "flex-row-reverse text-right"
      )}
    >
      <TeamCrest
        name={team.name}
        seed={team.crestSeed}
        crestUrl={team.crestUrl}
        size="md"
        className="shrink-0"
      />
      <div className={cn("flex min-w-0 flex-col", align === "right" && "items-end")}>
        <span className="truncate font-display text-lg font-bold leading-tight">
          {team.name}
        </span>
        <span className="font-data text-[11px] text-outline">
          {team.eaId?.trim() || "—"}
        </span>
        {team.position != null && (
          <span className="mt-1 font-data text-[11px] uppercase tracking-wide text-on-surface-variant">
            {ordinal(team.position)} · {team.points} pts
          </span>
        )}
      </div>
    </Link>
  );
}

const METRICS: { key: keyof MatchCentreTeam; label: string; fmt?: (v: number) => string }[] =
  [
    { key: "position", label: "Position", fmt: (v) => (v ? ordinal(v) : "—") },
    { key: "played", label: "Played" },
    { key: "won", label: "Won" },
    { key: "drawn", label: "Drawn" },
    { key: "lost", label: "Lost" },
    {
      key: "goalDifference",
      label: "Goal diff",
      fmt: (v) => (v > 0 ? `+${v}` : `${v}`),
    },
    { key: "points", label: "Points" },
  ];

function ComparisonRow({
  label,
  home,
  away,
  emphasise,
}: {
  label: string;
  home: string;
  away: string;
  emphasise?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <span
        className={cn(
          "text-right font-data tabular text-sm",
          emphasise ? "font-bold text-on-surface" : "text-on-surface-variant"
        )}
      >
        {home}
      </span>
      <span className="text-center font-data text-[10px] uppercase tracking-widest text-outline">
        {label}
      </span>
      <span
        className={cn(
          "font-data tabular text-sm",
          emphasise ? "font-bold text-on-surface" : "text-on-surface-variant"
        )}
      >
        {away}
      </span>
    </div>
  );
}

function RecentColumn({
  team,
  align,
}: {
  team: MatchCentreTeam;
  align: "left" | "right";
}) {
  if (!team.recent.length) {
    return (
      <div>
        <p
          className={cn(
            "mb-2 font-data text-[11px] uppercase tracking-wide text-on-surface-variant",
            align === "right" && "text-right"
          )}
        >
          {team.name}
        </p>
        <p className="font-data text-xs text-outline">No completed matches yet.</p>
      </div>
    );
  }
  return (
    <div>
      <p
        className={cn(
          "mb-2 font-data text-[11px] uppercase tracking-wide text-on-surface-variant",
          align === "right" && "text-right"
        )}
      >
        {team.name}
      </p>
      <ul className="flex flex-col gap-1.5">
        {team.recent.map((m: RecentResult) => (
          <li key={m.fixtureId}>
            <Link
              href={`/fixtures/${m.fixtureId}`}
              className={cn(
                "flex items-center gap-2 rounded-md border border-outline-variant/50 bg-surface-container-lowest px-2.5 py-1.5 text-xs transition-colors hover:border-outline-variant hover:bg-surface-container-low",
                align === "right" && "flex-row-reverse text-right"
              )}
            >
              <ResultTag r={m.result} />
              <span className="w-9 shrink-0 font-data text-[10px] uppercase text-outline">
                MW {m.matchweekNumber}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="text-outline">
                  {m.isHome ? "vs " : "at "}
                </span>
                {m.opponentName}
              </span>
              <span className="shrink-0 font-data tabular font-bold text-on-surface">
                {m.teamScore}&ndash;{m.oppScore}
              </span>
              {m.forfeit && (
                <span className="shrink-0 font-data text-[9px] uppercase tracking-wide text-warn">
                  FF
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function MatchCentrePage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  const mc = await getMatchCentre(fixtureId);
  if (!mc) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerIsParticipant =
    !!user &&
    (mc.participants.homeProfileId === user.id ||
      mc.participants.awayProfileId === user.id);

  const { fixture, home, away, matchweek, h2h, result } = mc;
  const completed = fixture.status === "completed";
  const isForfeit = completed && !!fixture.forfeitedTeamId;
  const priorMeetings = h2h.meetings.filter(
    (m) => !m.isCurrent && m.status === "completed"
  );
  const reverseFixture = h2h.meetings.find(
    (m) => !m.isCurrent && m.status !== "completed"
  );
  const h2hTotal = h2h.homeWins + h2h.draws + h2h.awayWins;

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <Link
        href="/fixtures"
        className="inline-flex items-center gap-1.5 font-data text-xs uppercase tracking-wide text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft className="size-3.5" />
        Fixtures
      </Link>

      {/* Hero */}
      <Card variant="accent" className="overflow-hidden">
        <div className="flex flex-col items-center gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-3 text-center">
          <span className="font-data text-[11px] uppercase tracking-widest text-on-surface-variant">
            {mc.season.name} · Matchweek {matchweek.number}
          </span>
          {matchweek.weekend && (
            <span className="font-data text-xs text-outline">
              {matchweek.weekend}
            </span>
          )}
          <StatusPill
            tone={
              completed ? (isForfeit ? "warn" : "positive") : "info"
            }
            className="mt-1"
          >
            {completed ? (isForfeit ? "Forfeit" : "Full time") : "Upcoming"}
          </StatusPill>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-6 sm:gap-6 sm:px-8">
          <TeamHead team={home} align="left" />

          <div className="flex min-w-[92px] flex-col items-center">
            {completed ? (
              <span className="font-data text-4xl font-bold tracking-widest text-secondary-fixed">
                <CountUpScore value={fixture.homeScore ?? 0} />
                <span className="mx-1.5 text-outline-variant">-</span>
                <CountUpScore value={fixture.awayScore ?? 0} />
              </span>
            ) : (
              <span className="font-display text-2xl font-bold italic text-outline">
                vs
              </span>
            )}
          </div>

          <TeamHead team={away} align="right" />
        </div>

        {(isForfeit || result) && (
          <div className="border-t border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-center font-data text-[11px] text-on-surface-variant">
            {isForfeit
              ? `${fixture.forfeitedTeamName ?? "A team"} did not show — result awarded by forfeit.`
              : result?.approvedAt
                ? `Reported by ${result.reportedByName ?? "a manager"} · confirmed ${format(
                    parseISO(result.approvedAt),
                    "d MMM yyyy"
                  )}`
                : `Reported by ${result?.reportedByName ?? "a manager"}`}
          </div>
        )}
      </Card>

      {viewerIsParticipant && !completed && (
        <Link
          href={`/matches/report?fixtureId=${fixture.id}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-primary-container/40 bg-primary-container/[0.08] px-4 py-3 font-data text-xs uppercase tracking-widest text-primary-fixed transition-colors hover:bg-primary-container/[0.14]"
        >
          <ClipboardList className="size-4" />
          Report this result
        </Link>
      )}

      {/* Standings snapshot */}
      <Card variant="outline">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Where they stand</CardTitle>
          <span className="font-data text-[11px] text-outline">
            of {mc.totalTeams} teams
          </span>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-3">
            <span className="text-right font-display text-sm font-semibold">
              {home.name}
            </span>
            <span className="text-center font-data text-[10px] uppercase tracking-widest text-outline">
              form
            </span>
            <span className="font-display text-sm font-semibold">
              {away.name}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-1">
            <div className="flex justify-end">
              <FormRun form={home.form} />
            </div>
            <span />
            <div className="flex justify-start">
              <FormRun form={away.form} />
            </div>
          </div>
          <div className="mt-2 divide-y divide-outline-variant/40">
            {METRICS.map((m) => {
              const hv = home[m.key] as number | null;
              const av = away[m.key] as number | null;
              const fmt = m.fmt ?? ((v: number) => `${v}`);
              return (
                <ComparisonRow
                  key={m.label}
                  label={m.label}
                  home={hv == null ? "—" : fmt(hv)}
                  away={av == null ? "—" : fmt(av)}
                  emphasise={m.key === "points"}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Head to head */}
      <Card variant="outline">
        <CardHeader>
          <CardTitle>Head to head</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {priorMeetings.length > 0 ? (
            <>
              <div className="flex items-stretch overflow-hidden rounded-lg border border-outline-variant font-data text-xs">
                <div className="flex-1 bg-secondary-fixed/12 px-3 py-2 text-center text-secondary-fixed">
                  <span className="block text-lg font-bold tabular">
                    {h2h.homeWins}
                  </span>
                  {home.name}
                </div>
                <div className="flex-1 bg-surface-container-highest px-3 py-2 text-center text-on-surface-variant">
                  <span className="block text-lg font-bold tabular">
                    {h2h.draws}
                  </span>
                  {h2hTotal === 1 ? "Draw" : "Draws"}
                </div>
                <div className="flex-1 bg-primary-container/10 px-3 py-2 text-center text-primary-fixed">
                  <span className="block text-lg font-bold tabular">
                    {h2h.awayWins}
                  </span>
                  {away.name}
                </div>
              </div>
              <p className="text-center font-data text-[11px] text-outline">
                Aggregate goals {h2h.homeGoals}&ndash;{h2h.awayGoals} across{" "}
                {h2hTotal} {h2hTotal === 1 ? "meeting" : "meetings"} this season
              </p>
              <ul className="flex flex-col gap-1.5">
                {priorMeetings.map((m) => (
                  <li key={m.fixtureId}>
                    <Link
                      href={`/fixtures/${m.fixtureId}`}
                      className="flex items-center gap-3 rounded-md border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 text-sm transition-colors hover:border-outline-variant hover:bg-surface-container-low"
                    >
                      <span className="w-12 shrink-0 font-data text-[10px] uppercase text-outline">
                        MW {m.matchweekNumber}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-right">
                        {m.homeName}
                      </span>
                      <span className="shrink-0 font-data tabular font-bold text-on-surface">
                        {m.homeScore}&ndash;{m.awayScore}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {m.awayName}
                      </span>
                      {m.forfeit && (
                        <span className="shrink-0 font-data text-[9px] uppercase tracking-wide text-warn">
                          FF
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="font-data text-xs text-on-surface-variant">
              First meeting between {home.name} and {away.name} this season.
            </p>
          )}

          {reverseFixture && (
            <Link
              href={`/fixtures/${reverseFixture.fixtureId}`}
              className="flex items-center justify-between rounded-md border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 font-data text-xs text-on-surface-variant transition-colors hover:border-outline-variant hover:text-on-surface"
            >
              <span>
                {completed ? "Other" : "Reverse"} fixture · Matchweek{" "}
                {reverseFixture.matchweekNumber}
              </span>
              <span className="text-outline">
                {reverseFixture.homeName} vs {reverseFixture.awayName} →
              </span>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Road to here */}
      <Card variant="outline">
        <CardHeader>
          <CardTitle>Road to the match</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <RecentColumn team={home} align="left" />
          <RecentColumn team={away} align="right" />
        </CardContent>
      </Card>
    </div>
  );
}
