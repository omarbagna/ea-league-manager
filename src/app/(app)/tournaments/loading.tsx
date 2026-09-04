import { Skeleton, AdminListSkeleton } from "@/components/ui/skeleton";

export default function TournamentsLoading() {
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <AdminListSkeleton rows={4} />
    </div>
  );
}
