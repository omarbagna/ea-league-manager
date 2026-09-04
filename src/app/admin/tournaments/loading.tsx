import { Skeleton, CardBlockSkeleton, AdminListSkeleton } from "@/components/ui/skeleton";

export default function AdminTournamentsLoading() {
  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <CardBlockSkeleton className="max-w-md" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <AdminListSkeleton rows={3} />
      </div>
    </div>
  );
}
