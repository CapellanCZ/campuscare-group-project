import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Route-level fallback: only the data panel is skeletonized.
 * Page chrome (sidebar, header, titles/filters from the previous view) stays put.
 */
export function StaffRouteLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-4", className)}
      aria-busy="true"
      aria-label="Loading records"
    >
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
