import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta"
import { panelCardClassName } from "@/components/layout/panel-frame"

type StatCardProps = {
  label: string
  value: string
  description?: string
  delta?: number
  lowerIsBetter?: boolean
  className?: string
  icon?: React.ReactNode
  /** Efferd flush cell — no radius/ring when nested in PanelFrame */
  flush?: boolean
  /** Optional navigation target — overlay link keeps Card as the outer node */
  href?: string
  /** Optional click handler (e.g. open a sheet). Ignored when `href` is set. */
  onClick?: () => void
}

export function StatCard({
  label,
  value,
  description,
  delta,
  lowerIsBetter = false,
  className,
  icon,
  flush = false,
  href,
  onClick,
}: StatCardProps) {
  const trendPositive =
    typeof delta === "number"
      ? lowerIsBetter
        ? delta <= 0
        : delta >= 0
      : null

  const interactive = Boolean(href || onClick)
  const ariaLabel = `${label}: ${value}`

  return (
    <Card
      className={cn(
        "relative min-w-0 shadow-none dark:ring-0",
        flush && panelCardClassName,
        interactive &&
          "transition-colors hover:bg-muted/40 focus-within:bg-muted/40",
        className
      )}
    >
      {href ? (
        <Link
          href={href}
          className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={ariaLabel}
        />
      ) : onClick ? (
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={ariaLabel}
          onClick={onClick}
        />
      ) : null}

      <CardHeader className="relative z-0 flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="font-normal text-xs tracking-wide text-muted-foreground uppercase">
            {label}
          </CardTitle>
          <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        {icon ? (
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4"
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="relative z-0 flex flex-wrap items-center gap-x-2 gap-y-1 pt-0">
        {typeof delta === "number" ? (
          <CardDescription
            className={cn(
              "flex items-center gap-1 text-xs tabular-nums",
              trendPositive === true && "text-success",
              trendPositive === false && "text-destructive"
            )}
          >
            <Delta value={delta}>
              <DeltaIcon />
              <DeltaValue />
            </Delta>
          </CardDescription>
        ) : null}
        {description ? (
          <span className="truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}
