import { Skeleton } from "@/components/ui/skeleton";

export default function TournamentDetailLoading() {
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        <Skeleton className="h-64 w-52 shrink-0 rounded-xl" />
        <Skeleton className="h-64 w-52 shrink-0 rounded-xl" />
        <Skeleton className="h-64 w-52 shrink-0 rounded-xl" />
      </div>
    </div>
  );
}
