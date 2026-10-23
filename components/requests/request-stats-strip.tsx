"use client"

import type { ComponentType } from "react"
import {
  IconCalendarEvent,
  IconClockHour4,
  IconListDetails,
  IconProgress,
  IconXboxX,
} from "@tabler/icons-react"

import { AnimatedCount } from "@/components/shared/animated-count"
import {
  PanelCell,
  PanelFrame,
  PanelGrid,
} from "@/components/layout/panel-frame"
import { cn } from "@/lib/utils"
import type { AppointmentRequestStats } from "@/types/appointmentRequest"

const ITEMS = [
  {
    key: "pending" as const,
    label: "Pending",
    description: "Awaiting nurse review",
    icon: IconClockHour4,
  },
  {
    key: "waitlisted" as const,
    label: "Waitlisted",
    description: "Date capacity full",
    icon: IconListDetails,
  },
  {
    key: "rescheduled" as const,
    label: "Rescheduled",
    description: "New slots proposed",
    icon: IconCalendarEvent,
  },
  {
    key: "in_progress" as const,
    label: "In progress",
    description: "Consultation underway",
    icon: IconProgress,
  },
  {
    key: "cancelled" as const,
    label: "Declined",
    description: "Declined by nurse",
    icon: IconXboxX,
  },
] satisfies Array<{
  key: keyof AppointmentRequestStats
  label: string
  description: string
  icon: ComponentType<{ className?: string; stroke?: number }>
}>

export function RequestStatsStrip({
  stats,
  activeKey,
  onSelect,
  className,
  /** When false, render the hairline grid only — nest inside a parent PanelFrame. */
  framed = true,
}: {
  stats: AppointmentRequestStats
  activeKey?: string | null
  onSelect?: (key: string) => void
  className?: string
  framed?: boolean
}) {
  const values: Record<(typeof ITEMS)[number]["key"], number> = {
    pending: stats.pending,
    waitlisted: stats.waitlisted ?? 0,
    rescheduled: stats.rescheduled,
    in_progress: stats.in_progress ?? 0,
    cancelled: stats.cancelled,
  }

  const grid = (
    <PanelGrid
      className={cn(
        "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        !framed && className
      )}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon
        const count = values[item.key]
        const selected = activeKey === item.key
        const interactive = Boolean(onSelect)

        return (
          <PanelCell key={item.key}>
            <button
              type="button"
              disabled={!interactive}
              onClick={() => onSelect?.(item.key)}
              className={cn(
                "flex h-full w-full min-w-0 flex-col gap-2 bg-background px-4 py-3.5 text-left transition-colors outline-none",
                interactive &&
                  "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                selected && "bg-muted/50"
              )}
              aria-pressed={interactive ? selected : undefined}
              aria-label={`${item.label}: ${count}. ${item.description}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      selected ? "text-primary" : "text-muted-foreground"
                    )}
                    stroke={1.75}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "truncate text-xs font-medium tracking-wide",
                      selected ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </span>
                {selected ? (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
              </div>

              <AnimatedCount
                value={count}
                className={cn(
                  "text-2xl font-semibold tracking-tight tabular-nums",
                  selected ? "text-foreground" : "text-muted-foreground",
                  count > 0 && selected && "text-primary"
                )}
              />

              <span className="truncate text-xs text-muted-foreground">
                {item.description}
              </span>
            </button>
          </PanelCell>
        )
      })}
    </PanelGrid>
  )

  if (!framed) return grid
  return <PanelFrame className={className}>{grid}</PanelFrame>
}

/** Optimistic local adjust when a request moves between statuses. */
export function shiftRequestStats(
  stats: AppointmentRequestStats,
  fromStatus: string | null | undefined,
  toStatus: string
): AppointmentRequestStats {
  const next = { ...stats }
  const keys = [
    "pending",
    "confirmed",
    "waitlisted",
    "rescheduled",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ] as const

  function bump(status: string, delta: number) {
    const key = status as (typeof keys)[number]
    if (!keys.includes(key)) return
    next[key] = Math.max(0, (next[key] ?? 0) + delta)
  }

  if (fromStatus && fromStatus !== toStatus) {
    bump(fromStatus, -1)
    bump(toStatus, 1)
  } else if (!fromStatus) {
    bump(toStatus, 1)
    next.total = Math.max(0, next.total + 1)
  }

  return next
}
