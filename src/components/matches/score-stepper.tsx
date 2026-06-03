"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScoreStepper({
  value,
  onChange,
  label,
  teamName,
  eaId,
  isHome,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  teamName: string;
  eaId?: string | null;
  isHome?: boolean;
}) {
  const bump = (delta: number) => {
    const next = Math.max(0, Math.min(99, value + delta));
    onChange(next);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-outline-variant/50 bg-surface-container-low p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-outline-variant bg-surface shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
          <span className="font-display text-xs font-bold text-on-surface-variant">
            {teamName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <span className="font-data text-[10px] uppercase text-outline">
            {isHome ? "Home (You)" : label}
          </span>
          <div className="font-display text-lg font-bold text-on-surface">
            {teamName}
            {eaId && (
              <span className="ml-1 font-data text-xs font-normal text-on-surface-variant">
                (EA: {eaId})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => bump(-1)}
          className="flex size-12 items-center justify-center rounded-lg border-2 border-outline bg-surface-container transition-all hover:border-primary-container active:scale-95"
        >
          <Minus className="size-5" />
        </button>
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-highest font-data text-4xl text-primary",
            value > 0 && "score-pulse"
          )}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={() => bump(1)}
          className="flex size-12 items-center justify-center rounded-lg border-2 border-outline bg-surface-container transition-all hover:border-primary-container active:scale-95"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}
