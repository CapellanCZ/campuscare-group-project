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

type StatTone = {
  icon: ComponentType<{ className?: string; stroke?: number }>
  chip: string
  value: string
  ring: string
  active: string
}

const TONES: Record<string, StatTone> = {
  pending: {
    icon: IconClockHour4,
    chip: "bg-warning/15 text-warning-foreground dark:text-warning",
    value: "text-foreground",
    ring: "ring-warning/35",
    active: "bg-warning/8",
  },
  waitlisted: {
    icon: IconListDetails,
    chip: "bg-muted text-muted-foreground",
    value: "text-foreground",
    ring: "ring-border",
    active: "bg-muted/50",
  },
  rescheduled: {
    icon: IconCalendarEvent,
    chip: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
    value: "text-foreground",
    ring: "ring-sky-500/30",
    active: "bg-sky-500/6",
  },
  in_progress: {
    icon: IconProgress,
    chip: "bg-primary/12 text-primary",
    value: "text-foreground",
    ring: "ring-primary/30",
    active: "bg-primary/6",
  },
  cancelled: {
    icon: IconXboxX,
    chip: "bg-destructive/12 text-destructive",
    value: "text-foreground",
    ring: "ring-destructive/30",
    active: "bg-destructive/6",
  },
}

const ITEMS = [
  {
    key: "pending" as const,
    label: "Pending",
    description: "Awaiting nurse review",
  },
  {
    key: "waitlisted" as const,
    label: "Waitlisted",
    description: "Date capacity full",
  },
  {
    key: "rescheduled" as const,
    label: "Rescheduled",
    description: "New slots proposed",
  },
  {
    key: "in_progress" as const,
    label: "In Progress",
    description: "Consultation underway",
  },
  {
    key: "cancelled" as const,
    label: "Declined",
    description: "Declined by nurse",
  },
]

export function RequestStatsStrip({
  stats,
  activeKey,
  onSelect,
  className,
}: {
  stats: AppointmentRequestStats
  activeKey?: string | null
  onSelect?: (key: string) => void
  className?: string
}) {
  const values: Record<(typeof ITEMS)[number]["key"], number> = {
    pending: stats.pending,
    waitlisted: stats.waitlisted ?? 0,
    rescheduled: stats.rescheduled,
    in_progress: stats.in_progress ?? 0,
    cancelled: stats.cancelled,
  }

  return (
    <PanelFrame className={className}>
      <PanelGrid className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ITEMS.map((item) => {
          const tone = TONES[item.key]
          const Icon = tone.icon
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
                  "flex w-full min-w-0 flex-col gap-2 px-4 py-3.5 text-left transition-colors",
                  interactive && "hover:bg-muted/40 focus-visible:bg-muted/40",
                  interactive &&
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  selected && tone.active
                )}
                aria-pressed={interactive ? selected : undefined}
                aria-label={`${item.label}: ${count}. ${item.description}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-shadow duration-300",
                      tone.chip,
                      count > 0 && `ring-1 ${tone.ring}`
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" stroke={1.75} />
                  </span>
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:text-xs">
                    {item.label}
                  </span>
                </div>

                <AnimatedCount
                  value={count}
                  className={cn(
                    "text-2xl font-semibold tracking-tight",
                    tone.value,
                    count > 0 && item.key === "pending" && "text-warning-foreground dark:text-warning",
                    count > 0 && item.key === "cancelled" && "text-destructive",
                    count > 0 && item.key === "rescheduled" && "text-sky-700 dark:text-sky-400",
                    count > 0 && item.key === "in_progress" && "text-primary"
                  )}
                />

                <span className="line-clamp-2 text-[11px] text-muted-foreground sm:truncate sm:text-xs">
                  {item.description}
                </span>
              </button>
            </PanelCell>
          )
        })}
      </PanelGrid>
    </PanelFrame>
  )
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
