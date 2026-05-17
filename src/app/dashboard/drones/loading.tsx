import { Skeleton } from "@/components/ui/skeleton";

export default function DronesLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
