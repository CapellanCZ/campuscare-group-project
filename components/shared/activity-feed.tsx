import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { relativeTimeFrom } from "@/lib/health/time"
import type { ActivityItem } from "@/lib/health/types"
import { cn } from "@/lib/utils"

export function ActivityFeed({
  items,
  className,
  title = "Recent activity",
}: {
  items: ActivityItem[]
  className?: string
  title?: string
}) {
  return (
    <Card className={cn("min-w-0 shadow-none dark:ring-0", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">
            Queue updates will show here as patients move through stations.
          </p>
        ) : (
          <ul className="divide-y border-t">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex min-w-0 items-start justify-between gap-3 px-6 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {item.statusLabel ? (
                    <>
                      <span className="capitalize">{item.statusLabel}</span>
                      {" · "}
                    </>
                  ) : null}
                  {relativeTimeFrom(item.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
