"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Copies `value` to the clipboard and briefly confirms. Used for opponent
 * EA IDs so a player can paste straight into the game.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : `Copy ${label ?? value}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-outline-variant bg-surface-container px-2 py-1 font-data text-xs text-on-surface-variant transition-colors hover:border-primary-container hover:text-primary",
        className
      )}
    >
      <span className="truncate">{label ?? value}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-secondary-fixed" />
      ) : (
        <Copy className="size-3.5 shrink-0" />
      )}
    </button>
  );
}
