import Link from "next/link";
import { cn } from "@/lib/utils";

/** Shared sidebar / drawer nav row — accent bar + tint on active, no heavy fill. */
export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg py-2 pl-3.5 pr-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary-container/[0.12] text-primary-fixed"
          : "text-on-surface-variant hover:bg-surface-container-high/60 hover:text-on-surface"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-fixed transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          active
            ? "text-primary-fixed"
            : "text-outline group-hover:text-on-surface-variant"
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Small uppercase label that groups a set of nav rows. */
export function SidebarNavGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3.5 pb-1 pt-4 font-data text-[10px] uppercase tracking-[0.14em] text-outline first:pt-1">
      {children}
    </p>
  );
}

/** Rounded context chip under the logo (season name, "Admin console", …). */
export function SidebarContextChip({
  label,
  live,
}: {
  label: string;
  live?: boolean;
}) {
  return (
    <span className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-2.5 py-1">
      {live && (
        <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-secondary-fixed" />
      )}
      <span className="truncate font-data text-[11px] uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
    </span>
  );
}
