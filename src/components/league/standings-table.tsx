import Link from "next/link";
import { Minus, MoveDown, MoveUp } from "lucide-react";
import { TeamCrest } from "@/components/league/team-crest";
import {
  formPoints,
  zoneForPosition,
  type LeagueZone,
  type MatchResult,
} from "@/lib/standings";
import type { StandingRow } from "@/types/database";
import { cn } from "@/lib/utils";

const ZONE_META: Record<
  LeagueZone,
  { label: string; bar: string; dot: string }
> = {
  champion: {
    label: "Title",
    bar: "bg-secondary-fixed",
    dot: "bg-secondary-fixed",
  },
  promotion: {
    label: "Playoff places",
    bar: "bg-primary-fixed",
    dot: "bg-primary-fixed",
  },
  relegation: { label: "Relegation", bar: "bg-error", dot: "bg-error" },
};

function MovementCell({ delta }: { delta: number | undefined }) {
  if (delta === undefined || delta === 0) {
    return <Minus className="size-3 text-outline" aria-label="No change" />;
  }
  if (delta > 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-secondary-fixed"
        aria-label={`Up ${delta}`}
      >
        <MoveUp className="size-3" />
        <span className="font-data text-[11px]">{delta}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-error"
      aria-label={`Down ${-delta}`}
    >
      <MoveDown className="size-3" />
      <span className="font-data text-[11px]">{-delta}</span>
    </span>
  );
}

export function FormRun({ form }: { form: MatchResult[] | undefined }) {
  if (!form?.length) {
    return <span className="font-data text-xs text-outline">—</span>;
  }
  const tone: Record<MatchResult, string> = {
    W: "bg-secondary-fixed/15 text-secondary-fixed border-secondary-fixed/40",
    D: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
    L: "bg-error/10 text-error border-error/40",
  };
  return (
    <span className="inline-flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
          className={cn(
            "flex size-5 items-center justify-center rounded border font-data text-[10px] font-bold",
            tone[r]
          )}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export function StandingsTable({
  standings,
  highlightTeamId,
  compact,
  movement,
  formByTeam,
  showZones,
  positionOffset = 0,
  totalTeams,
}: {
  standings: StandingRow[];
  highlightTeamId?: string;
  compact?: boolean;
  movement?: Map<string, number>;
  formByTeam?: Map<string, MatchResult[]>;
  showZones?: boolean;
  /** rank of the first row - 1, when `standings` is a windowed slice */
  positionOffset?: number;
  /** full league size, when `standings` is a windowed slice */
  totalTeams?: number;
}) {
  const total = totalTeams ?? standings.length;
  const zonesOn = showZones ?? !compact;
  const withForm = !compact && !!formByTeam;

  return (
    <div className="w-full overflow-x-auto sm:overflow-x-visible">
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-surface-container-highest font-data text-[11px] uppercase tracking-wider text-on-surface-variant">
          <tr className="border-b border-outline-variant">
            <th className="h-10 w-14 px-2 text-center font-medium">Pos</th>
            <th className="h-10 px-3 text-left font-medium">Team</th>
            {withForm && (
              <th className="hidden h-10 px-3 text-center font-medium md:table-cell">
                Form
              </th>
            )}
            <th className="h-10 w-10 px-2 text-center font-medium">P</th>
            {!compact && (
              <>
                <th className="hidden h-10 w-10 px-2 text-center font-medium sm:table-cell">
                  W
                </th>
                <th className="hidden h-10 w-10 px-2 text-center font-medium sm:table-cell">
                  D
                </th>
                <th className="hidden h-10 w-10 px-2 text-center font-medium sm:table-cell">
                  L
                </th>
              </>
            )}
            <th className="h-10 w-12 px-2 text-center font-medium">GD</th>
            <th className="h-10 w-12 px-2 text-center font-medium text-primary-fixed">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const position = positionOffset + i + 1;
            const highlighted = row.team_id === highlightTeamId;
            const zone = zonesOn ? zoneForPosition(position, total) : null;
            return (
              <tr
                key={row.team_id}
                className={cn(
                  "border-b border-outline-variant/50 transition-colors hover:bg-surface-container-high/50",
                  highlighted && "bg-primary-fixed/[0.06]"
                )}
              >
                <td className="relative px-2 py-2.5 text-center">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 w-[3px]",
                      zone ? ZONE_META[zone].bar : "bg-transparent",
                      highlighted && !zone && "bg-primary-fixed"
                    )}
                  />
                  <span className="flex items-center justify-center gap-1.5">
                    <span
                      className={cn(
                        "font-data tabular",
                        highlighted && "font-bold text-primary-fixed"
                      )}
                    >
                      {position}
                    </span>
                    {!compact && <MovementCell delta={movement?.get(row.team_id)} />}
                  </span>
                </td>

                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-2.5">
                    <TeamCrest
                      name={row.team?.name ?? "—"}
                      seed={row.team?.crest_seed}
                      crestUrl={row.team?.crest_url}
                      size="sm"
                      className="size-7"
                    />
                    <span
                      className={cn(
                        "font-semibold",
                        highlighted && "text-primary-fixed"
                      )}
                    >
                      {row.team?.name ?? "—"}
                    </span>
                    {row.team?.disqualified_at && (
                      <span className="rounded bg-error-container/30 px-1.5 py-0.5 font-data text-[10px] font-semibold uppercase text-error">
                        DQ
                      </span>
                    )}
                  </span>
                </td>

                {withForm && (
                  <td className="hidden px-3 py-2.5 text-center md:table-cell">
                    <FormRun form={formByTeam?.get(row.team_id)} />
                  </td>
                )}

                <td className="px-2 py-2.5 text-center font-data tabular text-on-surface-variant">
                  {row.played}
                </td>
                {!compact && (
                  <>
                    <td className="hidden px-2 py-2.5 text-center font-data tabular sm:table-cell">
                      {row.won}
                    </td>
                    <td className="hidden px-2 py-2.5 text-center font-data tabular sm:table-cell">
                      {row.drawn}
                    </td>
                    <td className="hidden px-2 py-2.5 text-center font-data tabular sm:table-cell">
                      {row.lost}
                    </td>
                  </>
                )}
                <td className="px-2 py-2.5 text-center font-data tabular text-on-surface-variant">
                  {row.goal_difference > 0
                    ? `+${row.goal_difference}`
                    : row.goal_difference}
                </td>
                <td className="px-2 py-2.5 text-center font-data tabular font-bold text-surface-tint">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {zonesOn && total > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-3 py-3 text-[11px] text-on-surface-variant">
          {(["champion", "promotion", "relegation"] as LeagueZone[])
            .filter((z) =>
              standings.some(
                (_, i) => zoneForPosition(positionOffset + i + 1, total) === z
              )
            )
            .map((z) => (
              <span key={z} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2.5 w-1 rounded-sm", ZONE_META[z].dot)} />
                {ZONE_META[z].label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

export function StandingsTableCard({
  standings,
  highlightTeamId,
  title = "League Standings",
  viewAllHref = "/standings",
  movement,
  positionOffset = 0,
  totalTeams,
}: {
  standings: StandingRow[];
  highlightTeamId?: string;
  title?: string;
  viewAllHref?: string;
  movement?: Map<string, number>;
  positionOffset?: number;
  totalTeams?: number;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
        <Link
          href={viewAllHref}
          className="font-data text-xs text-primary-fixed hover:underline"
        >
          View Full Table →
        </Link>
      </div>
      <StandingsTable
        standings={standings}
        highlightTeamId={highlightTeamId}
        movement={movement}
        positionOffset={positionOffset}
        totalTeams={totalTeams}
        showZones={false}
        compact
      />
    </section>
  );
}

/** Small "who's hot" panel that fills the empty space beside the table on wide screens. */
export function LeagueSpotlight({
  standings,
  formByTeam,
}: {
  standings: StandingRow[];
  formByTeam?: Map<string, MatchResult[]>;
}) {
  if (!standings.length) return null;

  const played = standings.filter((r) => r.played > 0);

  const mostGoals = [...played]
    .sort((a, b) => b.goals_for - a.goals_for)
    .slice(0, 3);
  const bestDefense = [...played]
    .sort(
      (a, b) =>
        a.goals_against / a.played - b.goals_against / b.played
    )
    .slice(0, 3);
  const inForm = formByTeam
    ? [...played]
        .map((r) => ({ r, fp: formPoints(formByTeam.get(r.team_id)) }))
        .filter((x) => (formByTeam.get(x.r.team_id)?.length ?? 0) > 0)
        .sort((a, b) => b.fp - a.fp)
        .slice(0, 3)
        .map((x) => x.r)
    : [];

  const blocks: { label: string; rows: { row: StandingRow; value: string }[] }[] =
    [
      {
        label: "Most goals",
        rows: mostGoals.map((row) => ({ row, value: `${row.goals_for}` })),
      },
      {
        label: "Best defense",
        rows: bestDefense.map((row) => ({
          row,
          value: `${row.goals_against} GA`,
        })),
      },
    ];
  if (inForm.length) {
    blocks.push({
      label: "In form",
      rows: inForm.map((row) => ({
        row,
        value: (formByTeam?.get(row.team_id) ?? []).join(" "),
      })),
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect">
      <div className="border-b border-outline-variant bg-surface-container-low p-4">
        <h3 className="font-display text-lg font-semibold text-primary">
          Season leaders
        </h3>
      </div>
      <div className="grid divide-y divide-outline-variant/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
        {blocks.map((block) => (
          <div key={block.label} className="p-4">
            <p className="mb-2.5 font-data text-[11px] uppercase tracking-wider text-on-surface-variant">
              {block.label}
            </p>
            <ul className="space-y-2">
              {block.rows.map(({ row, value }, i) => (
                <li
                  key={row.team_id}
                  className="flex items-center gap-2.5 text-sm"
                >
                  <span className="w-3 font-data text-xs text-outline">
                    {i + 1}
                  </span>
                  <TeamCrest
                    name={row.team?.name ?? "—"}
                    seed={row.team?.crest_seed}
                    crestUrl={row.team?.crest_url}
                    size="sm"
                    className="size-6"
                  />
                  <span className="flex-1 truncate font-medium">
                    {row.team?.name ?? "—"}
                  </span>
                  <span className="font-data text-xs text-primary-fixed">
                    {value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
