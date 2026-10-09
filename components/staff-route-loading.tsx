import { Skeleton } from "@/components/ui/skeleton"

/** Instant route fallback while staff page data loads. */
export function StaffRouteLoading({ className }: { className?: string }) {
  return (
    <div
      className={className ?? "flex flex-1 flex-col gap-6"}
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="min-h-72 w-full flex-1 rounded-xl" />
    </div>
  )
}
