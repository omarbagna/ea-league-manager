"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { formatWeekendRange } from "@/lib/format-weekend";
import { isMatchweekActive } from "@/lib/forfeit-eligibility";
import { cn } from "@/lib/utils";

export type MatchweekInfo = {
  id: string;
  number: number;
  starts_at: string | null;
  ends_at: string | null;
};

export function resolveDefaultExpandedMatchweekId(
  groups: { matchweek: MatchweekInfo }[],
  preferredId?: string | null
): string | undefined {
  if (preferredId && groups.some((g) => g.matchweek.id === preferredId)) {
    return preferredId;
  }

  const calendarActive = groups.find((g) =>
    isMatchweekActive(g.matchweek.starts_at, g.matchweek.ends_at)
  );
  if (calendarActive) return calendarActive.matchweek.id;

  return groups[0]?.matchweek.id;
}

export function useMatchweekExpansion(
  filtered: { matchweek: MatchweekInfo }[],
  defaultExpandedMatchweekId?: string | null
) {
  const filteredIds = useMemo(
    () => filtered.map((g) => g.matchweek.id),
    [filtered]
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const id = resolveDefaultExpandedMatchweekId(
      filtered,
      defaultExpandedMatchweekId
    );
    return id ? new Set([id]) : new Set();
  });

  useEffect(() => {
    const validIds = new Set(filteredIds);
    setExpandedIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      if (next.size === prev.size && [...prev].every((id) => next.has(id))) {
        return prev;
      }
      return next;
    });
  }, [filteredIds]);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return { expandedIds, toggle };
}

export function MatchweekFixturesGroup({
  matchweek,
  fixtureCount,
  expanded,
  onToggle,
  children,
}: {
  matchweek: MatchweekInfo;
  fixtureCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const weekend = formatWeekendRange(matchweek.starts_at, matchweek.ends_at);
  const panelId = `matchweek-fixtures-${matchweek.id}`;
  const fixtureLabel = fixtureCount === 1 ? "1 fixture" : `${fixtureCount} fixtures`;

  return (
    <section className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3">
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-on-surface-variant transition-transform",
            expanded && "rotate-180"
          )}
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-xl font-bold text-primary">
            Matchweek {matchweek.number}
          </span>
          {weekend && (
            <span className="font-data text-xs text-on-surface-variant">
              {weekend}
            </span>
          )}
        </div>
        <span className="shrink-0 font-data text-xs text-on-surface-variant">
          {fixtureLabel}
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="flex flex-col gap-4 pt-4">
          {children}
        </div>
      )}
    </section>
  );
}
