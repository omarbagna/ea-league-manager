import { Skeleton, CardBlockSkeleton, AdminListSkeleton } from "@/components/ui/skeleton";

export default function AdminSeasonsLoading() {
  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      <Skeleton className="h-8 w-40" />
      <CardBlockSkeleton className="max-w-md" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <AdminListSkeleton rows={3} />
      </div>
    </div>
  );
}
