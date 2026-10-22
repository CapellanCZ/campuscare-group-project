"use client"

import type { ComponentType } from "react"
import {
  IconAlertTriangle,
  IconCheck,
  IconClockHour4,
  IconUserOff,
} from "@tabler/icons-react"

import { AnimatedCount } from "@/components/shared/animated-count"
import type { QueueStatusSegment } from "@/components/queue/queue-status-toolbar"
import { cn } from "@/lib/utils"

export type QueueStatusLane = Extract<
  QueueStatusSegment,
  "waiting" | "emergency" | "no_show" | "completed"
>

const LANES: Array<{
  id: QueueStatusLane
  label: string
  hint: string
  icon: ComponentType<{ className?: string; stroke?: number }>
}> = [
  {
    id: "waiting",
    label: "Waiting",
    hint: "In line for care",
    icon: IconClockHour4,
  },
  {
    id: "emergency",
    label: "Emergencies",
    hint: "Urgent priority",
    icon: IconAlertTriangle,
  },
  {
    id: "no_show",
    label: "No-show",
    hint: "Missed their call",
    icon: IconUserOff,
  },
  {
    id: "completed",
    label: "Completed",
    hint: "Finished today",
    icon: IconCheck,
  },
]

export function QueueStatusLaneSwitcher({
  value,
  counts,
  onChange,
}: {
  value: QueueStatusLane
  counts: Record<QueueStatusLane, number>
  onChange: (lane: QueueStatusLane) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Patient status"
      className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4"
    >
      {LANES.map((lane) => {
        const selected = value === lane.id
        const count = counts[lane.id]
        const Icon = lane.icon
        const danger = lane.id === "emergency"
        return (
          <button
            key={lane.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(lane.id)}
            className={cn(
              "flex min-w-0 flex-col gap-2 bg-background px-4 py-3.5 text-left transition-colors outline-none",
              "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              selected && "bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    selected
                      ? danger
                        ? "text-destructive"
                        : "text-primary"
                      : "text-muted-foreground"
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
                  {lane.label}
                </span>
              </span>
              {selected ? (
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    danger ? "bg-destructive" : "bg-primary"
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
            <AnimatedCount
              value={count}
              className={cn(
                "font-semibold text-2xl tracking-tight tabular-nums",
                selected ? "text-foreground" : "text-muted-foreground",
                count > 0 && selected && (danger ? "text-destructive" : "text-primary")
              )}
            />
            <span className="truncate text-xs text-muted-foreground">
              {lane.hint}
            </span>
          </button>
        )
      })}
    </div>
  )
}
