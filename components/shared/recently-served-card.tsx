import { Card, CardContent } from "@/components/ui/card"
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
    <Card className={cn("min-w-0 shadow-none dark:ring-0", className)}>
      <CardContent className="flex items-start justify-between gap-3 pt-(--card-spacing)">
        <div className="min-w-0">
          <p className="truncate font-semibold text-primary">{item.ticketLabel}</p>
          <p className="truncate text-sm text-muted-foreground">
            {item.patientName} · {item.assignedPersonnel || item.stationLabel}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {relativeTimeFrom(item.servedAt)}
        </span>
      </CardContent>
    </Card>
  )
}
