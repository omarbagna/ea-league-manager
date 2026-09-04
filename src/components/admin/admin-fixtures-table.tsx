"use client";

import { useMemo, useState } from "react";
import { AdminFixtureForfeitDialog } from "@/components/admin/admin-fixture-forfeit-dialog";
import { AdminFixtureRevertDialog } from "@/components/admin/admin-fixture-revert-dialog";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isMatchweekActive } from "@/lib/forfeit-eligibility";
import type { RevertableSubmission } from "@/lib/queries/submissions";
import type { FixtureWithTeams } from "@/types/database";

type Matchweek = {
  id: string;
  number: number;
  starts_at: string | null;
  ends_at: string | null;
};

type Group = { matchweek: Matchweek; fixtures: FixtureWithTeams[] };
type Team = { id: string; name: string };

function statusPill(f: FixtureWithTeams): { tone: PillTone; label: string } {
  if (f.status === "completed") {
    return f.forfeited_team_id
      ? { tone: "warn", label: "Forfeit" }
      : { tone: "positive", label: "Full time" };
  }
  if (f.status === "in_progress") return { tone: "live", label: "Live" };
  if (f.status === "void") return { tone: "neutral", label: "Void" };
  return { tone: "info", label: "Scheduled" };
}

export function AdminFixturesTable({
  groups,
  teams,
  revertableByFixtureId,
}: {
  groups: Group[];
  teams: Team[];
  revertableByFixtureId: Map<string, RevertableSubmission>;
}) {
  const currentMwId = useMemo(() => {
    const active = groups.find((g) =>
      isMatchweekActive(g.matchweek.starts_at, g.matchweek.ends_at)
    );
    if (active) return active.matchweek.id;
    const withOpen = groups.find((g) =>
      g.fixtures.some((f) => f.status !== "completed")
    );
    return withOpen?.matchweek.id ?? groups[0]?.matchweek.id ?? "";
  }, [groups]);

  const [mwFilter, setMwFilter] = useState<string>("current");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const rows = useMemo(() => {
    const activeMwId = mwFilter === "current" ? currentMwId : mwFilter;
    return groups
      .filter((g) => mwFilter === "all" || g.matchweek.id === activeMwId)
      .flatMap((g) =>
        g.fixtures
          .filter(
            (f) =>
              teamFilter === "all" ||
              f.home_team_id === teamFilter ||
              f.away_team_id === teamFilter
          )
          .map((f) => ({ f, mw: g.matchweek }))
      );
  }, [groups, mwFilter, teamFilter, currentMwId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select value={mwFilter} onValueChange={setMwFilter}>
            <SelectTrigger aria-label="Filter by matchweek">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current matchweek</SelectItem>
              <SelectItem value="all">All matchweeks</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.matchweek.id} value={g.matchweek.id}>
                  Matchweek {g.matchweek.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger aria-label="Filter by team">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-surface-container-highest font-data text-[11px] uppercase tracking-wider text-on-surface-variant">
            <tr className="border-b border-outline-variant">
              <th className="h-10 w-14 px-3 text-center font-medium">MW</th>
              <th className="h-10 px-3 text-right font-medium">Home</th>
              <th className="h-10 w-20 px-2 text-center font-medium">Score</th>
              <th className="h-10 px-3 text-left font-medium">Away</th>
              <th className="h-10 px-3 text-left font-medium">Status</th>
              <th className="h-10 px-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-on-surface-variant"
                >
                  No fixtures match these filters.
                </td>
              </tr>
            ) : (
              rows.map(({ f, mw }) => {
                const pill = statusPill(f);
                const revertable = revertableByFixtureId.get(f.id);
                const isForfeit =
                  f.status === "completed" && !!f.forfeited_team_id;
                return (
                  <tr
                    key={f.id}
                    className="border-b border-outline-variant/50 last:border-0 hover:bg-surface-container-high/40"
                  >
                    <td className="px-3 py-2.5 text-center font-data tabular text-on-surface-variant">
                      {mw.number}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {f.home_team.name}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {f.status === "completed" ? (
                        <span className="font-data tabular font-bold text-secondary-fixed">
                          {f.home_score}–{f.away_score}
                        </span>
                      ) : (
                        <span className="font-data text-outline">–</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {f.away_team.name}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {f.status !== "completed" ? (
                        <AdminFixtureForfeitDialog fixture={f} />
                      ) : revertable && !isForfeit ? (
                        <AdminFixtureRevertDialog
                          fixture={f}
                          revertable={revertable}
                        />
                      ) : (
                        <span className="font-data text-xs text-outline">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
