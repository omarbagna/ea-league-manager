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
    <div className="flex flex-col gap-3 rounded-lg border border-outline-variant/50 bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] sm:size-12">
          <span className="font-display text-xs font-bold text-on-surface-variant">
            {teamName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <span className="font-data text-[11px] uppercase text-outline">
            {isHome ? "Home (You)" : label}
          </span>
          <div className="font-display text-lg font-bold text-on-surface">
            <span className="block truncate">{teamName}</span>
            {eaId && (
              <span className="mt-0.5 block font-data text-xs font-normal text-on-surface-variant sm:mt-0 sm:inline sm:ml-1">
                (EA: {eaId})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 self-stretch sm:gap-4 sm:self-auto">
        <button
          type="button"
          onClick={() => bump(-1)}
          className="flex size-10 items-center justify-center rounded-lg border-2 border-outline bg-surface-container transition-all hover:border-primary-container active:scale-95 sm:size-12"
        >
          <Minus className="size-5" />
        </button>
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-highest font-data text-3xl text-primary sm:size-16 sm:text-4xl",
            value > 0 && "score-pulse"
          )}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={() => bump(1)}
          className="flex size-10 items-center justify-center rounded-lg border-2 border-outline bg-surface-container transition-all hover:border-primary-container active:scale-95 sm:size-12"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}
