import Link from "next/link";
import { Activity, Minus, MoveDown, MoveUp } from "lucide-react";
import { getDisplaySeason } from "@/lib/season";
import { getPowerRankings } from "@/lib/queries/power-rankings";
import type { EloRow } from "@/lib/queries/power-rankings";
import { TeamCrest } from "@/components/league/team-crest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Sparkline({ history }: { history: number[] }) {
  if (history.length < 2) {
    return (
      <span className="inline-flex h-5 w-16 shrink-0 items-center justify-center font-data text-[10px] text-outline">
        —
      </span>
    );
  }
  const w = 64;
  const h = 20;
  const pad = 2;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = max - min || 1;
  const points = history
    .map((v, i) => {
      const x = pad + (i / (history.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = history[history.length - 1] >= history[0];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={cn("shrink-0", rising ? "text-secondary-fixed" : "text-error")}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeltaTag({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="font-data text-[11px] text-outline">New</span>;
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-data text-[11px] text-outline">
        <Minus className="size-3" />
        0
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-data text-[11px] font-bold",
        up ? "text-secondary-fixed" : "text-error"
      )}
    >
      {up ? <MoveUp className="size-3" /> : <MoveDown className="size-3" />}
      {Math.abs(delta)}
    </span>
  );
}

function PositionDeltaTag({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-data text-[11px] text-outline">
        <Minus className="size-3" />
        Level
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-data text-[11px] font-bold",
        up ? "text-secondary-fixed" : "text-error"
      )}
    >
      {up ? <MoveUp className="size-3" /> : <MoveDown className="size-3" />}
      {Math.abs(delta)}
    </span>
  );
}

function EloRankRow({ row }: { row: EloRow }) {
  return (
    <li className="flex items-center gap-3 rounded-md px-2.5 py-2">
      <span className="w-4 shrink-0 text-center font-data text-xs text-outline">
        {row.rank}
      </span>
      <Link
        href={`/teams/${row.teamId}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 hover:text-primary"
      >
        <TeamCrest
          name={row.teamName}
          seed={row.crestSeed}
          crestUrl={row.crestUrl}
          size="sm"
          className="size-6 shrink-0"
        />
        <span className="truncate font-medium">{row.teamName}</span>
      </Link>
      <Sparkline history={row.history} />
      <span className="w-14 shrink-0 text-right font-data tabular text-sm font-bold text-on-surface">
        {row.rating}
      </span>
      <span className="w-10 shrink-0 text-right">
        <DeltaTag delta={row.delta} />
      </span>
    </li>
  );
}

export default async function PowerRankingsPage() {
  const display = await getDisplaySeason();

  if (!display) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <h2 className="mb-2 font-display text-3xl font-bold tracking-tight text-primary">
          Power Rankings
        </h2>
        <EmptyState
          icon={Activity}
          title="No season is running"
          description="Ratings appear here once a season is active and results start coming in."
        />
      </div>
    );
  }

  const { season, isArchived } = display;

  const data = await getPowerRankings(season.id);
  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <h2 className="mb-2 font-display text-3xl font-bold tracking-tight text-primary">
          Power Rankings
        </h2>
        <EmptyState
          icon={Activity}
          title="Couldn't load ratings"
          description="Something went wrong loading this season's power rankings. Try again shortly."
        />
      </div>
    );
  }
  const hasRatings = data.ratings.some((r) => r.played > 0);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary">
            Power Rankings
          </h2>
          {isArchived && <StatusPill tone="neutral">Final</StatusPill>}
        </div>
        <p className="mt-1 font-data text-sm text-on-surface-variant">
          {season.name}
          {isArchived
            ? " · season complete"
            : data.asOfMatchweek
              ? ` · as of Matchweek ${data.asOfMatchweek}`
              : ""}
        </p>
        <p className="mt-2 max-w-2xl text-xs text-on-surface-variant">
          A simplified Elo-style rating built from this season&apos;s results —
          it rewards wins against strong opponents more than routine ones.
          {isArchived
            ? " This is where it finished."
            : " The predicted table below projects it forward. Both are a read on current form, not a guarantee."}
        </p>
      </div>

      {!hasRatings ? (
        <EmptyState
          icon={Activity}
          title="No results yet"
          description="Ratings start moving as soon as the first matchweek is confirmed."
        />
      ) : (
        <>
          <Card variant="outline">
            <CardHeader>
              <CardTitle>Power ranking</CardTitle>
              <p className="text-[11px] leading-snug text-on-surface-variant">
                Every team, ranked by rating. The trend line is each team&apos;s
                last 8 results (or however many they&apos;ve played).
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <ol className="flex flex-col gap-0.5 divide-y divide-outline-variant/30">
                {data.ratings.map((row) => (
                  <EloRankRow key={row.teamId} row={row} />
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card variant="outline">
            <CardHeader>
              <CardTitle>Predicted final table</CardTitle>
              <p className="text-[11px] leading-snug text-on-surface-variant">
                {data.remainingFixtures > 0
                  ? `Ranked by projected finish: current points plus expected points from the ${data.remainingFixtures} fixtures left to play. "Now" is where they sit today.`
                  : "Every fixture has been played — this matches the final standings."}
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="w-full overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="font-data text-[11px] uppercase tracking-wider text-on-surface-variant">
                    <tr className="border-b border-outline-variant">
                      <th className="h-9 w-10 px-2 text-center font-medium">Now</th>
                      <th className="h-9 px-3 text-left font-medium">Team</th>
                      <th className="hidden h-9 w-10 px-2 text-center font-medium sm:table-cell">
                        Pld
                      </th>
                      <th className="h-9 w-12 px-2 text-center font-medium">Pts</th>
                      <th className="hidden h-9 w-14 px-2 text-center font-medium sm:table-cell">
                        xPts
                      </th>
                      <th className="h-9 w-16 px-2 text-center font-medium text-primary-fixed">
                        Proj Pts
                      </th>
                      <th className="h-9 w-16 px-2 text-center font-medium">Proj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.projected.map((row) => (
                      <tr
                        key={row.teamId}
                        className="border-b border-outline-variant/50 hover:bg-surface-container-high/50"
                      >
                        <td className="px-2 py-2 text-center font-data tabular text-on-surface-variant">
                          {row.currentPosition}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/teams/${row.teamId}`}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            <TeamCrest
                              name={row.teamName}
                              seed={row.crestSeed}
                              crestUrl={row.crestUrl}
                              size="sm"
                              className="size-6 shrink-0"
                            />
                            <span className="truncate font-medium">
                              {row.teamName}
                            </span>
                          </Link>
                        </td>
                        <td className="hidden px-2 py-2 text-center font-data tabular text-on-surface-variant sm:table-cell">
                          {row.played}
                        </td>
                        <td className="px-2 py-2 text-center font-data tabular font-bold text-on-surface">
                          {row.currentPoints}
                        </td>
                        <td className="hidden px-2 py-2 text-center font-data tabular text-on-surface-variant sm:table-cell">
                          +{row.expectedPoints.toFixed(1)}
                        </td>
                        <td className="px-2 py-2 text-center font-data tabular font-bold text-primary-fixed">
                          {row.projectedPoints.toFixed(1)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <PositionDeltaTag delta={row.positionDelta} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
