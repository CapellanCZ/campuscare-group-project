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

export function WaitStatusBadge({
  status,
  waitMinutes,
  className,
}: {
  status: TicketStatus | string
  waitMinutes?: number | null
  className?: string
}) {
  const urgency =
    status === "waiting" ? waitUrgencyFromMinutes(waitMinutes) : null
  const blink = blinkClassForStatus(status, waitMinutes)

  const statusText = ticketStatusLabel(status)
  // Timer stays in the pill for active queue states. Call / start / complete
  // actions reset estimated_wait_minutes to 0 so the pill shows · 0m.
  const label =
    waitMinutes != null &&
    (status === "waiting" || status === "called" || status === "ongoing")
      ? `${statusText} · ${waitMinutes}m`
      : statusText

  return (
    <StatusBadge
      label={label}
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
