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
import { Skeleton } from "@/components/ui/skeleton"

type StatCardProps = {
  label: string
  value: string
  description?: string
  delta?: number
  lowerIsBetter?: boolean
  className?: string
  icon?: React.ReactNode
  /** Soft icon/accent tint (e.g. patient-type color). Card body stays neutral. */
  accentColor?: string
  /** Efferd flush cell — no radius/ring when nested in PanelFrame */
  flush?: boolean
  /** Tighter padding / type for dense mobile KPI grids */
  compact?: boolean
  /** Optional navigation target — overlay link keeps Card as the outer node */
  href?: string
  /** Optional click handler (e.g. open a sheet). Ignored when `href` is set. */
  onClick?: () => void
  /** Keep label/icon; skeleton only the value + description. */
  loading?: boolean
}

export function StatCard({
  label,
  value,
  description,
  delta,
  lowerIsBetter = false,
  className,
  icon,
  accentColor,
  flush = false,
  compact = false,
  href,
  onClick,
  loading = false,
}: StatCardProps) {
  const trendPositive =
    typeof delta === "number"
      ? lowerIsBetter
        ? delta <= 0
        : delta >= 0
      : null

  const interactive = Boolean(href || onClick) && !loading
  const ariaLabel = loading ? `${label}: loading` : `${label}: ${value}`

  return (
    <Card
      className={cn(
        "relative min-w-0 shadow-none dark:ring-0",
        flush && panelCardClassName,
        compact && "gap-2 py-3 data-[size=sm]:[--card-spacing:--spacing(3)]",
        compact && "[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]",
        interactive &&
          "transition-colors hover:bg-muted/40 focus-within:bg-muted/40",
        className
      )}
      data-size={compact ? "sm" : undefined}
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

      <CardHeader className="relative z-0 flex flex-row items-start justify-between gap-2 space-y-0 pb-1 sm:gap-3 sm:pb-2">
        <div className="min-w-0 space-y-0.5 sm:space-y-1">
          <CardTitle className="font-normal text-[10px] tracking-wide text-muted-foreground uppercase sm:text-xs">
            {label}
          </CardTitle>
          {loading ? (
            <Skeleton
              className={cn(
                "mt-1 w-12 rounded-md",
                compact ? "h-6 sm:h-7" : "h-7"
              )}
            />
          ) : (
            <p
              className={cn(
                "truncate font-semibold tracking-tight tabular-nums",
                compact ? "text-xl sm:text-2xl" : "text-2xl"
              )}
            >
              {value}
            </p>
          )}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
              compact ? "size-8 sm:size-9" : "size-9",
              !accentColor && "bg-primary/10 text-primary"
            )}
            style={
              accentColor
                ? {
                    color: accentColor,
                    backgroundColor: `color-mix(in srgb, ${accentColor} 14%, transparent)`,
                  }
                : undefined
            }
            aria-hidden
          >
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="relative z-0 flex flex-wrap items-center gap-x-2 gap-y-1 pt-0">
        {loading ? (
          <Skeleton className="h-3 w-24 rounded-md" />
        ) : (
          <>
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
              <span className="line-clamp-2 text-[11px] text-muted-foreground sm:truncate sm:text-xs">
                {description}
              </span>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
