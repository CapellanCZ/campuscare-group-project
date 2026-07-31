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
  children,
  className,
}: {
  title: string
  description?: string
  href?: string
  linkLabel?: string
  badge?: string | number
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn(panelCardClassName, className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            {badge !== undefined ? (
              <Badge variant="secondary" className="tabular-nums">
                {badge}
              </Badge>
            ) : null}
          </div>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {href ? (
          <Button
            size="sm"
            variant="ghost"
            render={<Link href={href} />}
            nativeButton={false}
          >
            {linkLabel}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
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
          className="rounded-xl border border-border/60 px-3 py-2"
        >
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
