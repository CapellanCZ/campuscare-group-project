import { relativeTimeFrom } from "@/lib/health/time"
import type { RecentlyServedItem } from "@/lib/health/types"
import { cn } from "@/lib/utils"

export function RecentlyServedCard({
  item,
  className,
}: {
  item: RecentlyServedItem
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-3 border-b border-border/60 py-2.5 last:border-0 last:pb-0",
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-medium tabular-nums">{item.ticketLabel}</p>
        <p className="truncate text-sm text-muted-foreground">
          {item.patientName} · {item.assignedPersonnel || item.stationLabel}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {relativeTimeFrom(item.servedAt)}
      </span>
    </div>
  )
}
