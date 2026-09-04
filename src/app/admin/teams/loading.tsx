import { Skeleton, AdminListSkeleton } from "@/components/ui/skeleton";

export default function AdminTeamsLoading() {
  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <AdminListSkeleton rows={8} />
    </div>
  );
}
