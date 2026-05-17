import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="p-6 space-y-8">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
