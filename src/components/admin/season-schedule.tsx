import { formatWeekendRange } from "@/lib/format-weekend";
import type { FixtureWithTeams } from "@/types/database";

type MatchweekGroup = {
  matchweek: {
    id: string;
    number: number;
    starts_at: string | null;
    ends_at: string | null;
  };
  fixtures: FixtureWithTeams[];
};

export function SeasonSchedule({
  grouped,
  emptyMessage = "No schedule generated yet.",
}: {
  grouped: MatchweekGroup[];
  emptyMessage?: string;
}) {
  if (!grouped.length) {
    return (
      <p className="text-sm text-on-surface-variant">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(({ matchweek, fixtures }) => {
        const weekend = formatWeekendRange(
          matchweek.starts_at,
          matchweek.ends_at
        );
        return (
          <div
            key={matchweek.id}
            className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3"
          >
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h4 className="font-display text-sm font-semibold text-primary">
                Matchweek {matchweek.number}
              </h4>
              {weekend && (
                <span className="font-data text-xs text-on-surface-variant">
                  {weekend}
                </span>
              )}
            </div>
            {fixtures.length === 0 ? (
              <p className="text-xs text-on-surface-variant">No fixtures</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {fixtures.map((f) => (
                  <li key={f.id} className="font-data text-on-surface-variant">
                    {f.home_team?.name ?? "?"} vs {f.away_team?.name ?? "?"} —{" "}
                    {f.status}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
