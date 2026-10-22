"use client"

import type { QueueTicketRow, TicketStatus } from "@/lib/health/types"
import { selectItemsRecord } from "@/lib/ui/select-label"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const QUEUE_PAGE_SIZE_OPTIONS = [1, 2, 3, 4, 5, 10] as const
export type QueuePageSize = (typeof QUEUE_PAGE_SIZE_OPTIONS)[number]

export const QUEUE_PAGE_SIZE_STORAGE_KEY = "campuscare:queue-page-size"

export type QueueStatusSegment =
  | "all"
  | "emergency"
  | "waiting"
  | "called"
  | "ongoing"
  | "completed"
  | "no_show"
  | "expired"

export function readStoredQueuePageSize(
  fallback: QueuePageSize = 10
): QueuePageSize {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.sessionStorage.getItem(QUEUE_PAGE_SIZE_STORAGE_KEY)
    const n = Number(raw)
    if (QUEUE_PAGE_SIZE_OPTIONS.includes(n as QueuePageSize)) {
      return n as QueuePageSize
    }
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeStoredQueuePageSize(size: QueuePageSize) {
  try {
    window.sessionStorage.setItem(QUEUE_PAGE_SIZE_STORAGE_KEY, String(size))
  } catch {
    /* ignore */
  }
}

export type QueueStatusCounts = Record<QueueStatusSegment, number>

export function countQueueStatuses(rows: QueueTicketRow[]): QueueStatusCounts {
  const counts: QueueStatusCounts = {
    all: rows.length,
    emergency: 0,
    waiting: 0,
    called: 0,
    ongoing: 0,
    completed: 0,
    no_show: 0,
    expired: 0,
  }

  for (const row of rows) {
    if (row.priority === "urgent") counts.emergency += 1
    if (row.status === "waiting") counts.waiting += 1
    else if (row.status === "called") counts.called += 1
    else if (row.status === "ongoing") counts.ongoing += 1
    else if (row.status === "completed") counts.completed += 1
    else if (row.status === "no_show") counts.no_show += 1
    else if (row.status === "expired") counts.expired += 1
  }

  return counts
}

/** Filter tickets to one separated status list. */
export function matchesQueueStatusSegment(
  row: QueueTicketRow,
  segment: QueueStatusSegment
): boolean {
  if (segment === "all") return true
  if (segment === "emergency") return row.priority === "urgent"
  return row.status === (segment as TicketStatus)
}

const SEGMENT_LABELS: Record<QueueStatusSegment, string> = {
  all: "All patients",
  emergency: "Emergencies",
  waiting: "Waiting",
  called: "Called",
  ongoing: "Ongoing",
  completed: "Completed",
  no_show: "No-show",
  expired: "Skipped",
}

/** Compact page-size control under the status lane row. */
export function QueueStatusToolbar({
  segment,
  count,
  pageSize,
  onPageSizeChange,
  className,
}: {
  segment: QueueStatusSegment
  count: number
  pageSize: QueuePageSize
  onPageSizeChange: (size: QueuePageSize) => void
  className?: string
}) {
  const sizeItems = selectItemsRecord(
    QUEUE_PAGE_SIZE_OPTIONS.map((size) => ({
      value: String(size),
      label: size === 1 ? "1 patient" : `${size} patients`,
    }))
  )

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 sm:px-6",
        className
      )}
    >
      <p className="text-xs tabular-nums text-muted-foreground" role="status">
        <span className="font-medium text-foreground">
          {SEGMENT_LABELS[segment]}
        </span>
        <span className="mx-1.5 text-border">·</span>
        {count} listed
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted-foreground">Show</span>
        <Select
          value={String(pageSize)}
          items={sizeItems}
          onValueChange={(value) => {
            const next = Number(value)
            if (QUEUE_PAGE_SIZE_OPTIONS.includes(next as QueuePageSize)) {
              onPageSizeChange(next as QueuePageSize)
            }
          }}
        >
          <SelectTrigger
            className="h-8 w-[8.5rem]"
            aria-label="Patients per page"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUEUE_PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size === 1 ? "1 patient" : `${size} patients`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
