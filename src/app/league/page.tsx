import Link from "next/link";
import type { Metadata } from "next";
import { CalendarOff } from "lucide-react";
import { getPublicLeagueSnapshot } from "@/lib/queries/public-league";
import type { PublicFixture, PublicLeader } from "@/lib/queries/public-league";
import { AppLogo } from "@/components/brand/app-logo";
import { TeamCrest } from "@/components/league/team-crest";
import { StandingsTable } from "@/components/league/standings-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dark Elite League — Standings & Results",
  description:
    "Live standings, results and season leaders for the Dark Elite League — no account required.",
};

function FixtureRow({ fixture, showScore }: { fixture: PublicFixture; showScore: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <span className="w-9 shrink-0 font-data text-xs text-outline">
        MW{fixture.matchweekNumber}
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
        <span className="min-w-0 truncate font-medium">{fixture.home.name}</span>
        <TeamCrest
          name={fixture.home.name}
          seed={fixture.home.crestSeed}
          crestUrl={fixture.home.crestUrl}
          size="sm"
          className="size-6 shrink-0"
        />
      </span>
      <span className="shrink-0 px-1">
        {showScore ? (
          <span className="font-data tabular font-bold text-secondary-fixed">
            {fixture.homeScore}&ndash;{fixture.awayScore}
          </span>
        ) : (
          <span className="font-data text-xs text-outline">vs</span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <TeamCrest
          name={fixture.away.name}
          seed={fixture.away.crestSeed}
          crestUrl={fixture.away.crestUrl}
          size="sm"
          className="size-6 shrink-0"
        />
        <span className="min-w-0 truncate font-medium">{fixture.away.name}</span>
      </span>
      {!showScore && fixture.weekend && (
        <span className="hidden shrink-0 font-data text-xs text-on-surface-variant sm:inline">
          {fixture.weekend}
        </span>
      )}
      {showScore && fixture.forfeit && (
        <span className="shrink-0 font-data text-[10px] uppercase text-warn">FF</span>
      )}
    </li>
  );
}

function LeaderCard({ leader }: { leader: PublicLeader }) {
  return (
    <Card variant="outline" className="flex flex-col gap-2 p-3.5">
      <span className="font-data text-[10px] uppercase tracking-wide text-on-surface-variant">
        {leader.label}
      </span>
      <span className="flex items-center gap-2">
        <TeamCrest
          name={leader.team.name}
          seed={leader.team.crestSeed}
          crestUrl={leader.team.crestUrl}
          size="sm"
          className="size-7 shrink-0"
        />
        <span className="min-w-0 truncate font-medium text-on-surface">
          {leader.team.name}
        </span>
      </span>
      <span className="font-data text-sm font-bold text-primary-fixed">{leader.value}</span>
    </Card>
  );
}

export default async function PublicLeaguePage() {
  const snapshot = await getPublicLeagueSnapshot();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-[var(--spacing-margin-mobile)] py-4 md:px-6">
          <AppLogo size="sm" showTitle />
          <Link
            href="/login"
            className="font-data text-xs uppercase tracking-widest text-primary-fixed hover:underline"
          >
            Manager sign in →
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 space-y-8 px-[var(--spacing-margin-mobile)] py-8 md:px-6">
        {!snapshot.season ? (
          <EmptyState
            icon={CalendarOff}
            title="No season yet"
            description="Check back once the league gets underway."
          />
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-3xl font-bold tracking-tight text-primary md:text-4xl">
                  {snapshot.season.name}
                </h1>
                <StatusPill
                  tone={snapshot.season.isArchived ? "neutral" : "live"}
                  pulse={!snapshot.season.isArchived}
                >
                  {snapshot.season.isArchived ? "Season complete" : "Live"}
                </StatusPill>
              </div>
              <p className="mt-1 text-on-surface-variant">
                {snapshot.totalTeams} {snapshot.totalTeams === 1 ? "team" : "teams"} competing
              </p>
            </div>

            {snapshot.champion && (
              <Card variant="accent" className="flex items-center gap-4 p-5">
                <TeamCrest
                  name={snapshot.champion.team?.name ?? "—"}
                  seed={snapshot.champion.team?.crest_seed}
                  crestUrl={snapshot.champion.team?.crest_url}
                  size="lg"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-data text-[11px] uppercase tracking-widest text-on-surface-variant">
                    Champions
                  </p>
                  <p className="truncate font-display text-2xl font-bold text-primary">
                    {snapshot.champion.team?.name ?? "—"}
                  </p>
                  <p className="mt-1 font-data text-sm text-on-surface-variant">
                    {snapshot.champion.points} pts · {snapshot.champion.won}W{" "}
                    {snapshot.champion.drawn}D {snapshot.champion.lost}L
                  </p>
                </div>
              </Card>
            )}

            {snapshot.standings.length > 0 && (
              <section>
                <h2 className="mb-3 font-data text-xs uppercase tracking-wider text-on-surface-variant">
                  League table
                </h2>
                <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
                  <StandingsTable
                    standings={snapshot.standings}
                    totalTeams={snapshot.totalTeams}
                    showZones
                  />
                </section>
              </section>
            )}

            {snapshot.leaders.length > 0 && (
              <section>
                <h2 className="mb-3 font-data text-xs uppercase tracking-wider text-on-surface-variant">
                  Season leaders
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {snapshot.leaders.map((l) => (
                    <LeaderCard key={l.label} leader={l} />
                  ))}
                </div>
              </section>
            )}

            {(snapshot.recentResults.length > 0 || snapshot.upcomingFixtures.length > 0) && (
              <div className="grid gap-6 md:grid-cols-2">
                {snapshot.recentResults.length > 0 && (
                  <section>
                    <h2 className="mb-3 font-data text-xs uppercase tracking-wider text-on-surface-variant">
                      Recent results
                    </h2>
                    <ul className="divide-y divide-outline-variant/50 overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
                      {snapshot.recentResults.map((f) => (
                        <FixtureRow key={f.id} fixture={f} showScore />
                      ))}
                    </ul>
                  </section>
                )}
                {snapshot.upcomingFixtures.length > 0 && (
                  <section>
                    <h2 className="mb-3 font-data text-xs uppercase tracking-wider text-on-surface-variant">
                      Upcoming fixtures
                    </h2>
                    <ul className="divide-y divide-outline-variant/50 overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
                      {snapshot.upcomingFixtures.map((f) => (
                        <FixtureRow key={f.id} fixture={f} showScore={false} />
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-outline-variant py-6 text-center font-data text-xs text-on-surface-variant">
        Dark Elite League
      </footer>
    </div>
  );
}
