import { Skeleton, StandingsTableSkeleton } from "@/components/ui/skeleton";

export default function StandingsLoading() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <StandingsTableSkeleton rows={12} />
    </div>
  );
}
