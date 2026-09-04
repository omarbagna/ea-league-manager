import { Skeleton, StandingsTableSkeleton } from "@/components/ui/skeleton";

export default function SeasonArchiveLoading() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <StandingsTableSkeleton rows={10} />
    </div>
  );
}
