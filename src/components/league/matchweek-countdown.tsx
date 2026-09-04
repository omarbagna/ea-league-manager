"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function deadlineFrom(endsAt: string): number {
  // ends_at is a YYYY-MM-DD calendar date — the window closes at end of that day.
  const d = new Date(`${endsAt}T23:59:59`);
  return d.getTime();
}

function formatRemaining(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 1) return `${m}m left`;
  return "Closing now";
}

export function MatchweekCountdown({
  endsAt,
  className,
}: {
  endsAt: string | null | undefined;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!endsAt) return null;

  const deadline = deadlineFrom(endsAt);
  const remaining = now === null ? null : deadline - now;
  const ended = remaining !== null && remaining <= 0;
  const urgent = remaining !== null && !ended && remaining < 12 * 3600_000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-data text-xs",
        ended
          ? "text-on-surface-variant"
          : urgent
            ? "text-warn"
            : "text-primary-fixed",
        className
      )}
    >
      <Clock className="size-3.5 shrink-0" />
      {remaining === null
        ? "Report before the window closes"
        : ended
          ? "Matchweek ended"
          : `Report by end of ${new Date(deadline).toLocaleDateString(undefined, {
              weekday: "long",
            })} · ${formatRemaining(remaining)}`}
    </span>
  );
}
