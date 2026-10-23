"use client"

import type { ComponentType } from "react"
import { IconHeartbeat, IconStethoscope } from "@tabler/icons-react"

import { AnimatedCount } from "@/components/shared/animated-count"
import type { NurseQueueLane } from "@/lib/health/nurse-queue"
import { cn } from "@/lib/utils"

const LANES: Array<{
  id: NurseQueueLane
  label: string
  hint: string
  icon: ComponentType<{ className?: string; stroke?: number }>
}> = [
  {
    id: "needs_intake",
    label: "Needs intake",
    hint: "Vitals & assign",
    icon: IconHeartbeat,
  },
  {
    id: "at_specialty",
    label: "Specialty",
    hint: "Sent to clinician",
    icon: IconStethoscope,
  },
]

export function NurseLaneTab({
  lane,
  selected,
  count,
  onSelect,
}: {
  lane: NurseQueueLane
  selected: boolean
  count: number
  onSelect: (lane: NurseQueueLane) => void
}) {
  const config = LANES.find((item) => item.id === lane)
  if (!config) return null
  const Icon = config.icon

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(lane)}
      className={cn(
        "flex h-full min-w-0 w-full flex-col gap-2 bg-background px-4 py-3.5 text-left transition-colors outline-none",
        "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        selected && "bg-muted/50"
      )}
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
            {config.label}
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
          "font-semibold text-2xl tracking-tight tabular-nums",
          selected ? "text-foreground" : "text-muted-foreground",
          count > 0 && selected && "text-primary"
        )}
      />
      <span className="truncate text-xs text-muted-foreground">
        {config.hint}
      </span>
    </button>
  )
}

/** Standalone 2-up switcher (when not composed into a parent PanelGrid). */
export function NurseLaneSwitcher({
  value,
  counts,
  onChange,
}: {
  value: NurseQueueLane
  counts: Record<NurseQueueLane, number>
  onChange: (lane: NurseQueueLane) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Queue lanes"
      className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2"
    >
      {LANES.map((lane) => (
        <NurseLaneTab
          key={lane.id}
          lane={lane.id}
          selected={value === lane.id}
          count={counts[lane.id]}
          onSelect={onChange}
        />
      ))}
    </div>
  )
}
