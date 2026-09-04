import { Skeleton, CardBlockSkeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="rounded-xl border border-outline-variant bg-card p-5 glow-effect">
        <div className="flex items-center gap-4">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </div>
      <CardBlockSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        <CardBlockSkeleton />
        <CardBlockSkeleton />
      </div>
    </div>
  );
}
