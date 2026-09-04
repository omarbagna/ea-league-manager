import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A bordered consequence block — for text that must not read as body copy
 * (falsifying results, irreversible actions).
 */
export function WarningNote({
  children,
  tone = "warn",
  className,
}: {
  children: ReactNode;
  tone?: "warn" | "critical";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        tone === "critical"
          ? "border-error/40 bg-error/10 text-on-error-container"
          : "border-warn/40 bg-warn-container/20 text-on-warn-container",
        className
      )}
      role="note"
    >
      <AlertTriangle
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "critical" ? "text-error" : "text-warn"
        )}
      />
      <div className="[&_strong]:font-semibold">{children}</div>
    </div>
  );
}
