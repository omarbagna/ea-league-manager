import Link from "next/link";
import { Trophy } from "lucide-react";
import { getCompletedSeasons } from "@/lib/queries/season-archive";
import { getActiveSeason } from "@/lib/season";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamCrest } from "@/components/league/team-crest";
import { formatWeekendRange } from "@/lib/format-weekend";

export default async function HistoryPage() {
  const [seasons, activeSeason] = await Promise.all([
    getCompletedSeasons(),
    getActiveSeason(),
  ]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
          Hall of Fame
        </h2>
        <p className="mt-1 font-data text-sm text-on-surface-variant">
          Every champion the league has crowned
          {activeSeason ? ` · ${activeSeason.name} still in play` : ""}
        </p>
      </div>

      {seasons.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No completed seasons yet"
          description={
            activeSeason
              ? `${activeSeason.name} is the first — its winner shows up here once it wraps.`
              : "Champions are recorded here once a season finishes."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {seasons.map((s) => {
            const range = formatWeekendRange(s.startsAt, s.endsAt);
            return (
              <Card key={s.id} variant="raised" className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
                  <Trophy className="size-4 text-secondary-fixed" />
                  <span className="font-data text-xs uppercase tracking-widest text-on-surface-variant">
                    {s.name}
                    {range ? ` · ${range}` : ""}
                  </span>
                </div>
                <div className="p-5">
                  {s.champion ? (
                    <>
                      <Link
                        href={`/teams/${s.champion.team_id}`}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        <TeamCrest
                          name={s.champion.team?.name ?? "—"}
                          seed={s.champion.team?.crest_seed}
                          crestUrl={s.champion.team?.crest_url}
                          size="lg"
                        />
                        <div>
                          <span className="font-data text-[11px] uppercase tracking-wide text-secondary-fixed">
                            Champions
                          </span>
                          <p className="font-display text-xl font-bold leading-tight">
                            {s.champion.team?.name ?? "—"}
                          </p>
                          <p className="mt-0.5 font-data text-xs text-on-surface-variant">
                            {s.champion.points} pts · {s.champion.won}W-
                            {s.champion.drawn}D-{s.champion.lost}L
                          </p>
                        </div>
                      </Link>
                      {s.runnerUp && (
                        <p className="mt-3 font-data text-xs text-outline">
                          Runner-up:{" "}
                          <Link
                            href={`/teams/${s.runnerUp.team_id}`}
                            className="text-on-surface-variant hover:text-primary"
                          >
                            {s.runnerUp.team?.name ?? "—"}
                          </Link>{" "}
                          ({s.runnerUp.points} pts)
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      No table was recorded for this season.
                    </p>
                  )}
                  <Link
                    href={`/history/${s.id}`}
                    className="mt-4 inline-block font-data text-xs text-primary-fixed hover:underline"
                  >
                    Final table &amp; records →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
