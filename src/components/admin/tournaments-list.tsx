import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Swords } from "lucide-react";
import type { TournamentSummary } from "@/lib/queries/tournaments";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_TONE = {
  draft: "info",
  locked: "pending",
  active: "positive",
  completed: "neutral",
} as const;

const STATUS_LABEL: Record<TournamentSummary["status"], string> = {
  draft: "Signups open",
  locked: "Signups closed",
  active: "In progress",
  completed: "Completed",
};

function fmt(d: string | null): string | null {
  if (!d) return null;
  try {
    return format(parseISO(d), "d MMM");
  } catch {
    return null;
  }
}

export function TournamentsList({
  tournaments,
}: {
  tournaments: TournamentSummary[];
}) {
  if (!tournaments.length) {
    return (
      <EmptyState
        icon={Swords}
        title="No tournaments yet"
        description="Create one above to run a knockout bracket alongside the league."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {tournaments.map((t) => {
        const window =
          fmt(t.signupOpensAt) && fmt(t.signupClosesAt)
            ? `${fmt(t.signupOpensAt)} – ${fmt(t.signupClosesAt)}`
            : fmt(t.signupClosesAt)
              ? `closes ${fmt(t.signupClosesAt)}`
              : null;
        return (
          <li key={t.id}>
            <Link href={`/admin/tournaments/${t.id}`}>
              <Card
                variant="outline"
                className="flex flex-col gap-2 p-4 transition-colors hover:border-primary-container/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-semibold text-on-surface">
                      {t.name}
                    </span>
                    <StatusPill tone={STATUS_TONE[t.status]}>
                      {STATUS_LABEL[t.status]}
                    </StatusPill>
                  </div>
                  <p className="mt-1 font-data text-xs text-on-surface-variant">
                    {t.entrantCount} / {t.teamCount} teams
                    {window ? ` · ${window}` : ""}
                  </p>
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
