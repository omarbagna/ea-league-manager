import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StandingRow } from "@/types/database";
import { cn } from "@/lib/utils";

export function StandingsTable({
  standings,
  highlightTeamId,
  compact,
}: {
  standings: StandingRow[];
  highlightTeamId?: string;
  compact?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 text-center">Pos</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-center">P</TableHead>
          {!compact && (
            <>
              <TableHead className="text-center">W</TableHead>
              <TableHead className="text-center">D</TableHead>
              <TableHead className="text-center">L</TableHead>
            </>
          )}
          <TableHead className="text-center">GD</TableHead>
          <TableHead className="text-center text-primary-fixed">Pts</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((row, i) => {
          const highlighted = row.team_id === highlightTeamId;
          return (
            <TableRow
              key={row.team_id}
              className={cn(highlighted && "bg-primary-fixed/5")}
            >
              <TableCell
                className={cn(
                  "text-center font-data",
                  highlighted && "border-l-2 border-primary-fixed text-primary-fixed"
                )}
              >
                {i + 1}
              </TableCell>
              <TableCell className={cn("font-semibold", highlighted && "text-primary-fixed")}>
                {row.team?.name ?? "—"}
              </TableCell>
              <TableCell className="text-center font-data text-on-surface-variant">
                {row.played}
              </TableCell>
              {!compact && (
                <>
                  <TableCell className="text-center font-data">{row.won}</TableCell>
                  <TableCell className="text-center font-data">{row.drawn}</TableCell>
                  <TableCell className="text-center font-data">{row.lost}</TableCell>
                </>
              )}
              <TableCell className="text-center font-data text-primary-fixed">
                {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
              </TableCell>
              <TableCell className="text-center font-data font-bold text-surface-tint">
                {row.points}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function StandingsTableCard({
  standings,
  highlightTeamId,
  title = "League Standings",
  viewAllHref = "/standings",
}: {
  standings: StandingRow[];
  highlightTeamId?: string;
  title?: string;
  viewAllHref?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-[#0f1115] glow-effect">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-4">
        <h3 className="font-display flex items-center gap-2 text-lg font-semibold text-primary">
          {title}
        </h3>
        <Link
          href={viewAllHref}
          className="font-data text-xs text-primary-fixed hover:underline"
        >
          View Full Table →
        </Link>
      </div>
      <StandingsTable standings={standings} highlightTeamId={highlightTeamId} compact />
    </section>
  );
}
