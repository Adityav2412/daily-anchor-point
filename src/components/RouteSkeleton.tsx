import { Skeleton } from "@/components/ui/skeleton";

export function RouteSkeleton() {
  return (
    <div className="min-h-screen pb-32 max-w-md mx-auto px-6 pt-10 animate-pulse">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-12 w-48 mb-3" />
      <Skeleton className="h-4 w-40 mb-8" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}
