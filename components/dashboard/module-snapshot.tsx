import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { panelCardClassName } from "@/components/layout/panel-frame"
import { cn } from "@/lib/utils"

export function ModuleSnapshot({
  title,
  description,
  href,
  linkLabel = "View all",
  badge,
  toolbar,
  children,
  className,
}: {
  title: string
  description?: string
  href?: string
  linkLabel?: string
  badge?: string | number
  /** Optional controls (e.g. search) aligned with the title row. */
  toolbar?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn(panelCardClassName, "h-full", className)}>
      <CardHeader
        className={cn(
          "flex flex-col space-y-0 sm:flex-row sm:items-center sm:justify-between",
          toolbar ? "gap-4 pb-1" : "gap-3"
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CardTitle className="truncate text-base">{title}</CardTitle>
            {badge !== undefined ? (
              <Badge variant="secondary" className="tabular-nums">
                {badge}
              </Badge>
            ) : null}
          </div>
          {description ? (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          ) : null}
        </div>
        <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:max-w-sm sm:flex-row sm:items-center sm:justify-end">
          {toolbar}
          {href ? (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              render={<Link href={href} />}
              nativeButton={false}
            >
              {linkLabel}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent
        className={cn("min-w-0", toolbar ? "space-y-4 pt-2" : "space-y-3")}
      >
        {children}
      </CardContent>
    </Card>
  )
}

export function SnapshotStatRow({
  items,
}: {
  items: Array<{ label: string; value: string | number }>
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-xl bg-muted/50 px-3 py-2.5"
        >
          <p className="truncate text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
