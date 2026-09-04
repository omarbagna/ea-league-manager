import { Skeleton, StandingsTableSkeleton } from "@/components/ui/skeleton";

export default function AdminStandingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <StandingsTableSkeleton rows={12} />
    </div>
  );
}
