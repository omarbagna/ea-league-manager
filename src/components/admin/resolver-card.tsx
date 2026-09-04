import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

/** Shared shell for the admin report / dispute / no-show resolvers. */
export function ResolverCard({
  tone,
  kind,
  matchweekNumber,
  summary,
  busy,
  children,
}: {
  tone: PillTone;
  kind: string;
  matchweekNumber?: number | null;
  summary: ReactNode;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      variant="outline"
      className={cn(
        "overflow-hidden",
        busy && "pointer-events-none opacity-60"
      )}
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-lowest px-4 py-3">
        <StatusPill tone={tone}>{kind}</StatusPill>
        <span className="font-data text-[11px] uppercase tracking-wider text-outline">
          Matchweek {matchweekNumber ?? "—"}
        </span>
      </div>
      <div className="space-y-5 p-4">
        <p className="text-sm text-on-surface-variant">{summary}</p>
        {children}
      </div>
    </Card>
  );
}
