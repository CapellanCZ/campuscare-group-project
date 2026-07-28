"use client"

import type { NurseQueueLane } from "@/lib/health/nurse-queue"
import { cn } from "@/lib/utils"

const LANES: Array<{
  id: NurseQueueLane
  label: string
  hint: string
}> = [
  {
    id: "needs_intake",
    label: "Needs intake",
    hint: "Vitals & assign",
  },
  {
    id: "at_specialty",
    label: "Specialty",
    hint: "Sent to clinician",
  },
  {
    id: "exceptions",
    label: "Exceptions",
    hint: "No-show & rejoin",
  },
]

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
      className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3"
    >
      {LANES.map((lane) => {
        const selected = value === lane.id
        const count = counts[lane.id]
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
              <span
                className={cn(
                  "text-xs font-medium tracking-wide",
                  selected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {lane.label}
              </span>
              {selected ? (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </div>
            <span
              className={cn(
                "font-semibold text-2xl tabular-nums tracking-tight",
                selected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {count}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {lane.hint}
            </span>
          </button>
        )
      })}
    </div>
  )
}
