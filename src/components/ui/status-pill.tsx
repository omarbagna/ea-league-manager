import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Clock,
  Gavel,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One status vocabulary shared by the reporting hub, the fixtures list and
 * the admin queue. Always icon + label + colour — never colour alone.
 */
const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-data text-[11px] font-medium uppercase tracking-wide leading-none",
  {
    variants: {
      tone: {
        neutral:
          "border-outline-variant bg-surface-container text-on-surface-variant",
        info: "border-primary-container/35 bg-primary-container/10 text-primary-fixed",
        pending: "border-warn/40 bg-warn-container/25 text-warn",
        positive:
          "border-secondary-fixed/40 bg-secondary-fixed/12 text-secondary-fixed",
        critical: "border-error/45 bg-error/12 text-error",
        live: "border-secondary-fixed/45 bg-secondary-fixed/12 text-secondary-fixed",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

const DEFAULT_ICON: Record<
  NonNullable<VariantProps<typeof pillVariants>["tone"]>,
  React.ComponentType<{ className?: string }>
> = {
  neutral: CircleDashed,
  info: CircleDot,
  pending: Clock,
  positive: CircleCheck,
  critical: AlertTriangle,
  live: Radio,
};

type PillTone = NonNullable<VariantProps<typeof pillVariants>["tone"]>;

export function StatusPill({
  tone = "neutral",
  icon,
  className,
  children,
  pulse,
}: {
  tone?: PillTone;
  icon?: React.ComponentType<{ className?: string }> | null;
  className?: string;
  children: React.ReactNode;
  /** subtle pulse — reserve for a genuinely live state */
  pulse?: boolean;
}) {
  const Icon = icon === null ? null : (icon ?? DEFAULT_ICON[tone]);
  return (
    <span className={cn(pillVariants({ tone }), className)}>
      {Icon && (
        <Icon
          className={cn(
            "size-3 shrink-0",
            pulse && "animate-pulse motion-reduce:animate-none"
          )}
        />
      )}
      {children}
    </span>
  );
}

/** Map the reporting-hub status hints to a pill tone. */
export const REPORT_STATUS_TONE: Record<string, PillTone> = {
  "Ready to report": "info",
  "Awaiting opponent": "pending",
  "Pending your approval": "pending",
  "Under dispute": "critical",
};

/** Convenience wrapper for a dispute badge. */
export function DisputePill({ className }: { className?: string }) {
  return (
    <StatusPill tone="critical" icon={Gavel} className={className}>
      Under dispute
    </StatusPill>
  );
}

export { pillVariants };
export type { PillTone };
