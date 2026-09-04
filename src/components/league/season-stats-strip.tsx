import { Card } from "@/components/ui/card";
import { FormRun } from "@/components/league/standings-table";
import type { MatchResult } from "@/lib/standings";

function streakLabel(formNewestFirst: MatchResult[]): string {
  if (!formNewestFirst.length) return "—";
  const head = formNewestFirst[0];
  let n = 0;
  for (const r of formNewestFirst) {
    if (r === head) n++;
    else break;
  }
  const word = head === "W" ? "won" : head === "L" ? "lost" : "drawn";
  return `${word} ${n}`;
}

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

export function SeasonStatsStrip({
  form,
  record,
  goalsFor,
  goalsAgainst,
  cleanSheets,
}: {
  /** most-recent first, as returned by getRecentForm */
  form: MatchResult[];
  record: { won: number; drawn: number; lost: number };
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-data text-[11px] uppercase tracking-wide text-outline">
            Last 5
          </span>
          {form.length ? (
            <FormRun form={[...form].reverse()} />
          ) : (
            <span className="font-data text-sm text-on-surface-variant">
              No results yet
            </span>
          )}
        </div>
        <Stat
          label="Record"
          value={`${record.won}-${record.drawn}-${record.lost}`}
        />
        <Stat label="Scored" value={goalsFor} />
        <Stat label="Conceded" value={goalsAgainst} />
        <Stat label="Clean sheets" value={cleanSheets} />
        <Stat label="Streak" value={streakLabel(form)} />
      </div>
    </Card>
  );
}
