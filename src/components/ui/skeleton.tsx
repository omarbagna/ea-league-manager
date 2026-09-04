import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-surface-container-high motion-reduce:animate-none",
        className
      )}
    />
  );
}

/** Route-shaped placeholders — each mirrors the real layout so the page
 *  looks like it's assembling rather than hanging. */

export function StandingsTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect"
      role="status"
      aria-label="Loading standings"
    >
      <div className="flex items-center gap-3 border-b border-outline-variant bg-surface-container-highest px-3 py-3">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-24" />
        <div className="ml-auto flex gap-4">
          <Skeleton className="h-3 w-5" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-6" />
        </div>
      </div>
      <div className="divide-y divide-outline-variant/50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="h-4 w-5" />
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <div className="ml-auto flex gap-4">
              <Skeleton className="h-4 w-5" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardBlockSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-card p-4 glow-effect",
        className
      )}
    >
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="mb-2 h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** A titled block with N row placeholders — admin list/table pages
 *  (seasons, reports, disputes, forfeits, teams, users). */
export function AdminListSkeleton({
  rows = 6,
  rowClassName,
}: {
  rows?: number;
  rowClassName?: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-outline-variant bg-card glow-effect"
      role="status"
      aria-label="Loading"
    >
      <div className="flex items-center gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-outline-variant/50">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5",
              rowClassName
            )}
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Admin overview: action queue + KPI tiles + quick actions + a two-up block. */
export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Generic content skeleton for the (app) segment loading state. */
export function AppContentSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1280px] space-y-8"
      role="status"
      aria-label="Loading"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <CardBlockSkeleton className="lg:col-span-2" />
        <div className="space-y-6">
          <CardBlockSkeleton />
          <CardBlockSkeleton />
        </div>
      </div>
    </div>
  );
}
