import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Composed zero-state: a mark, one line of what's happening, one line of
 * what to do next, and an action when there is one. Replaces the
 * centered-grey-sentence pattern.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-14",
        className
      )}
    >
      {Icon && (
        <span
          className="mb-1 flex size-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-primary-fixed"
          aria-hidden
        >
          <Icon className="size-6" />
        </span>
      )}
      <h3 className="font-display text-lg font-semibold text-on-surface">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-on-surface-variant">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
