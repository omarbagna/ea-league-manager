import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTournamentDetailLoading() {
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center justify-between gap-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="flex gap-4 overflow-hidden">
        <Skeleton className="h-64 w-52 shrink-0 rounded-xl" />
        <Skeleton className="h-64 w-52 shrink-0 rounded-xl" />
        <Skeleton className="h-64 w-52 shrink-0 rounded-xl" />
      </div>
    </div>
  );
}
