"use client"

import { useEffect, useState } from "react"

import { StatusBadge } from "@/components/ui/status-badge"
import { ticketStatusLabel } from "@/lib/health/mappers"
import type { TicketStatus } from "@/lib/health/types"
import {
  STATUS_BADGE_DOT,
  STATUS_BADGE_TONE,
} from "@/lib/ui/status-badge-tone"
import { cn } from "@/lib/utils"

export type WaitUrgency = "ok" | "warn" | "urgent"

export function waitUrgencyFromMinutes(
  minutes: number | null | undefined
): WaitUrgency {
  if (minutes == null || minutes < 10) return "ok"
  if (minutes < 20) return "warn"
  return "urgent"
}

/** Elapsed whole minutes since an ISO timestamp (live timers). */
export function elapsedMinutesSince(
  iso: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!iso) return null
  const start = new Date(iso).getTime()
  if (Number.isNaN(start)) return null
  return Math.max(0, Math.floor((now.getTime() - start) / 60_000))
}

const urgencyTone: Record<WaitUrgency, string> = {
  ok: STATUS_BADGE_TONE.completed,
  warn: STATUS_BADGE_TONE.pending,
  urgent: STATUS_BADGE_TONE.cancelled,
}

const urgencyDotColor: Record<WaitUrgency, string> = {
  ok: STATUS_BADGE_DOT.completed,
  warn: STATUS_BADGE_DOT.pending,
  urgent: STATUS_BADGE_DOT.cancelled,
}

const ticketTone: Record<string, string> = {
  waiting: STATUS_BADGE_TONE.waiting,
  called: STATUS_BADGE_TONE.confirmed,
  ongoing: STATUS_BADGE_TONE.ongoing,
  completed: STATUS_BADGE_TONE.completed,
  expired: STATUS_BADGE_TONE.cancelled,
  no_show: STATUS_BADGE_TONE.no_show,
}

const ticketDot: Record<string, string> = {
  waiting: STATUS_BADGE_DOT.waiting,
  called: STATUS_BADGE_DOT.confirmed,
  ongoing: STATUS_BADGE_DOT.ongoing,
  completed: STATUS_BADGE_DOT.completed,
  expired: STATUS_BADGE_DOT.cancelled,
  no_show: STATUS_BADGE_DOT.no_show,
}

/** Active queue states blink; no_show / completed / expired stay static. */
function blinkClassForStatus(
  status: string,
  waitMinutes: number | null | undefined
): string | null {
  if (
    status === "no_show" ||
    status === "completed" ||
    status === "expired"
  ) {
    return null
  }
  if (status === "waiting") {
    const urgency = waitUrgencyFromMinutes(waitMinutes)
    if (urgency === "urgent") return "animate-wait-pulse-urgent"
    if (urgency === "warn") return "animate-wait-pulse-warn"
    return "animate-wait-pulse-ok"
  }
  if (status === "called" || status === "ongoing") {
    return "animate-wait-pulse-ok"
  }
  return null
}

function formatElapsedLabel(status: string, minutes: number | null): string {
  const statusText = ticketStatusLabel(status)
  if (minutes == null) return statusText
  if (status === "waiting") return `Waiting · ${minutes}m`
  if (status === "called") return `Called · ${minutes}m`
  if (status === "ongoing") return `Ongoing · ${minutes}m`
  return statusText
}

/**
 * Live status badge. Pass `since` (ISO) for elapsed minutes:
 * waiting → time in queue; called → time since last call.
 */
export function WaitStatusBadge({
  status,
  since,
  /** @deprecated Prefer `since` — ETA minutes are not elapsed wait. */
  waitMinutes,
  className,
}: {
  status: TicketStatus | string
  since?: string | null
  waitMinutes?: number | null
  className?: string
}) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!since) return
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [since])

  const elapsed = since
    ? elapsedMinutesSince(since, now)
    : (waitMinutes ?? null)

  const urgency =
    status === "waiting" ? waitUrgencyFromMinutes(elapsed) : null
  const blink = blinkClassForStatus(status, elapsed)

  return (
    <StatusBadge
      label={formatElapsedLabel(status, elapsed)}
      toneClassName={
        urgency
          ? urgencyTone[urgency]
          : (ticketTone[status] ?? STATUS_BADGE_TONE.waiting)
      }
      dotClassName={cn(
        urgency
          ? urgencyDotColor[urgency]
          : (ticketDot[status] ?? STATUS_BADGE_DOT.waiting),
        blink
      )}
      className={cn("tabular-nums normal-case", className)}
    />
  )
}

/** Timestamp to drive the live badge for a ticket row. */
export function waitTimerSince(row: {
  status: string
  createdAt: string | null
  updatedAt: string | null
}): string | null {
  if (row.status === "called" || row.status === "ongoing") {
    return row.updatedAt ?? row.createdAt
  }
  if (row.status === "waiting") {
    return row.createdAt ?? row.updatedAt
  }
  return null
}
