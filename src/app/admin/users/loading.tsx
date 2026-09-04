import { Skeleton, AdminListSkeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      <AdminListSkeleton rows={8} />
    </div>
  );
}
