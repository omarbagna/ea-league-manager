import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveSeason, getCurrentUserTeamId } from "@/lib/season";
import {
  getTeamProfile,
  headToHead,
  type TeamFixtureVM,
} from "@/lib/queries/team-profile";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamCrest } from "@/components/league/team-crest";
import { FormRun } from "@/components/league/standings-table";
import { CopyButton } from "@/components/ui/copy-button";
import { SeasonProgressChart } from "@/components/league/season-progress-chart";
import { cn } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="font-data text-[11px] uppercase tracking-wide text-outline">
        {label}
      </span>
      <span className="font-data text-lg tabular text-on-surface">{value}</span>
    </div>
  );
}

function ResultLetter({ r }: { r: "W" | "D" | "L" | null }) {
  if (!r) return <span className="font-data text-xs text-outline">—</span>;
  const label = r === "W" ? "Win" : r === "D" ? "Draw" : "Loss";
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "flex size-5 items-center justify-center border font-data text-[10px] font-bold",
        r === "W" &&
          "rounded-full border-secondary-fixed/50 bg-secondary-fixed/20 text-secondary-fixed",
        r === "D" &&
          "rounded-[3px] border-outline-variant bg-surface-container-highest text-on-surface-variant",
        r === "L" &&
          "rounded-md border-dashed border-error/60 bg-error/10 text-error"
      )}
    >
      {r}
    </span>
  );
}

function FixtureRow({ f }: { f: TeamFixtureVM }) {
  const done = f.status === "completed";
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <span className="w-6 shrink-0 font-data text-xs text-outline">
        MW{f.matchweekNumber}
      </span>
      <span className="w-8 shrink-0 font-data text-[11px] uppercase text-outline">
        {f.isHome ? "H" : "A"}
      </span>
      <Link
        href={`/teams/${f.opponent.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 hover:text-primary"
      >
        <TeamCrest
          name={f.opponent.name}
          seed={f.opponent.crestSeed}
          crestUrl={f.opponent.crestUrl}
          size="sm"
          className="size-6"
        />
        <span className="truncate font-medium">{f.opponent.name}</span>
      </Link>
      {done ? (
        <Link
          href={`/fixtures/${f.id}`}
          className="flex items-center gap-2 transition-colors hover:text-primary"
        >
          <span className="font-data tabular font-bold text-secondary-fixed">
            {f.teamScore}–{f.oppScore}
          </span>
          {f.forfeited && (
            <span className="font-data text-[11px] uppercase text-warn">ff</span>
          )}
          <ResultLetter r={f.result} />
        </Link>
      ) : (
        <Link
          href={`/fixtures/${f.id}`}
          className="font-data text-xs text-on-surface-variant transition-colors hover:text-primary"
        >
          {f.weekend ?? "TBD"}
        </Link>
      )}
    </li>
  );
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const profile = await getTeamProfile(teamId);
  if (!profile) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const activeSeason = await getActiveSeason();
  const viewerTeamId =
    user && activeSeason
      ? await getCurrentUserTeamId(user.id, activeSeason.id)
      : null;

  const { team, season, manager, position, totalTeams, standing, form, progress } =
    profile;

  const results = profile.fixtures.filter((f) => f.status === "completed");
  const upcoming = profile.fixtures.filter((f) => f.status !== "completed");
  const cleanSheets = results.filter((f) => f.oppScore === 0).length;

  const isOwnTeam = viewerTeamId === team.id;
  const h2h =
    viewerTeamId && !isOwnTeam
      ? headToHead(profile.fixtures, viewerTeamId)
      : null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Link
        href="/standings"
        className="inline-flex items-center gap-1.5 font-data text-xs text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Standings
      </Link>

      <Card variant="raised" className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <TeamCrest
            name={team.name}
            seed={team.crestSeed}
            crestUrl={team.crestUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-primary">
                {team.name}
              </h1>
              {team.disqualifiedAt && (
                <span className="rounded bg-error-container/30 px-1.5 py-0.5 font-data text-[10px] font-semibold uppercase text-error">
                  Disqualified
                </span>
              )}
            </div>
            <p className="mt-1 font-data text-sm text-on-surface-variant">
              {season.name}
              {position
                ? ` · ${position}${ordinal(position)} of ${totalTeams}`
                : ""}
              {standing ? ` · ${standing.points} pts` : ""}
            </p>
            {manager?.eaId ? (
              <div className="mt-2">
                {isOwnTeam ? (
                  <span className="font-data text-xs text-on-surface-variant">
                    EA ID: {manager.eaId}
                  </span>
                ) : (
                  <CopyButton
                    value={manager.eaId}
                    label={`EA: ${manager.eaId}`}
                  />
                )}
              </div>
            ) : (
              <p className="mt-2 font-data text-xs text-outline">EA ID not set</p>
            )}
          </div>
        </div>

        {standing && (
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-outline-variant/50 pt-4">
            <div className="flex flex-col gap-1.5">
              <span className="font-data text-[11px] uppercase tracking-wide text-outline">
                Form
              </span>
              {form.length ? (
                <FormRun form={form} />
              ) : (
                <span className="font-data text-sm text-on-surface-variant">
                  No results
                </span>
              )}
            </div>
            <Stat label="Played" value={standing.played} />
            <Stat
              label="W–D–L"
              value={`${standing.won}-${standing.drawn}-${standing.lost}`}
            />
            <Stat label="For" value={standing.goals_for} />
            <Stat label="Against" value={standing.goals_against} />
            <Stat
              label="GD"
              value={
                standing.goal_difference > 0
                  ? `+${standing.goal_difference}`
                  : standing.goal_difference
              }
            />
            <Stat label="Clean sheets" value={cleanSheets} />
          </div>
        )}
      </Card>

      {h2h && (h2h.played > 0 || h2h.meetings.length > 0) && (
        <Card variant="raised" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low p-4">
            <Swords className="size-4 text-primary-fixed" />
            <h3 className="font-display text-lg font-semibold text-primary">
              Your record vs {team.name}
            </h3>
          </div>
          <div className="p-4">
            <p className="font-data text-sm text-on-surface">
              {h2h.won}W · {h2h.drawn}D · {h2h.lost}L
              {h2h.played > 0 &&
                ` · ${h2h.goalsFor}–${h2h.goalsAgainst} on aggregate`}
            </p>
            <ul className="mt-3 divide-y divide-outline-variant/40">
              {h2h.meetings.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-data text-xs text-outline">
                    MW{m.matchweekNumber} · {m.isHome ? "away" : "home"}
                  </span>
                  {m.status === "completed" ? (
                    <span className="font-data tabular">
                      {m.oppScore}–{m.teamScore}
                    </span>
                  ) : (
                    <span className="font-data text-xs text-on-surface-variant">
                      {m.weekend ?? "TBD"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {progress.length > 0 && (
        <Card variant="raised" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low p-4">
            <BarChart3 className="size-4 text-primary" />
            <h3 className="font-display text-lg font-semibold text-primary">
              Points through the season
            </h3>
          </div>
          <div className="p-4">
            <SeasonProgressChart data={progress} />
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card variant="raised" className="overflow-hidden">
          <div className="border-b border-outline-variant bg-surface-container-low p-4">
            <h3 className="font-display text-lg font-semibold text-primary">
              Results
            </h3>
          </div>
          {results.length ? (
            <ul className="divide-y divide-outline-variant/40">
              {[...results].reverse().map((f) => (
                <FixtureRow key={f.id} f={f} />
              ))}
            </ul>
          ) : (
            <EmptyState compact title="No results yet" />
          )}
        </Card>

        <Card variant="raised" className="overflow-hidden">
          <div className="border-b border-outline-variant bg-surface-container-low p-4">
            <h3 className="font-display text-lg font-semibold text-primary">
              Upcoming
            </h3>
          </div>
          {upcoming.length ? (
            <ul className="divide-y divide-outline-variant/40">
              {upcoming.map((f) => (
                <FixtureRow key={f.id} f={f} />
              ))}
            </ul>
          ) : (
            <EmptyState compact title="Season complete" />
          )}
        </Card>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
