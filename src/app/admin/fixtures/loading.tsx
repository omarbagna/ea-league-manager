import { Skeleton, AdminListSkeleton } from "@/components/ui/skeleton";

export default function AdminFixturesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <AdminListSkeleton rows={6} />
    </div>
  );
}
