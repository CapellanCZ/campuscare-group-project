import { Badge } from "@/components/ui/badge"
import type { TicketStatus } from "@/lib/health/types"
import { cn } from "@/lib/utils"

export type WaitUrgency = "ok" | "warn" | "urgent"

export function waitUrgencyFromMinutes(
  minutes: number | null | undefined
): WaitUrgency {
  if (minutes == null || minutes < 10) return "ok"
  if (minutes < 20) return "warn"
  return "urgent"
}

const badgeClass: Record<WaitUrgency, string> = {
  ok: "border-success/30 bg-success/10 text-success",
  warn: "border-warning/40 bg-warning/15 text-warning-foreground",
  urgent: "border-destructive/40 bg-destructive/10 text-destructive",
}

const dotClass: Record<WaitUrgency, string> = {
  ok: "bg-success animate-wait-pulse-ok",
  warn: "bg-warning animate-wait-pulse-warn",
  urgent: "bg-destructive animate-wait-pulse-urgent",
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
    status === "waiting" || status === "called"
      ? waitUrgencyFromMinutes(waitMinutes)
      : null

  const label =
    status === "ongoing"
      ? "Ongoing"
      : waitMinutes != null &&
          (status === "waiting" || status === "called" || status === "ongoing")
        ? `${status} · ${waitMinutes}m`
        : status

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 capitalize tabular-nums",
        urgency ? badgeClass[urgency] : undefined,
        status === "ongoing" &&
          "border-primary/30 bg-primary/10 text-primary",
        className
      )}
    >
      {urgency ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", dotClass[urgency])}
          aria-hidden
        />
      ) : null}
      {label}
    </Badge>
  )
}
