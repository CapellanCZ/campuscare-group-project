"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { panelCardClassName } from "@/components/layout/panel-frame"
import { ticketLabel } from "@/lib/health/mappers"
import { needsNurseIntake, nextNurseIntakeTicket } from "@/lib/health/nurse-queue"
import type { QueueTicketRow } from "@/lib/health/types"
import { cn } from "@/lib/utils"
import { IconHeartbeat } from "@tabler/icons-react"

function WorkbenchBody({
  next,
  waitingCount,
  pending,
  onStartIntake,
}: {
  next: QueueTicketRow | null
  waitingCount: number
  pending?: boolean
  onStartIntake: (ticket: QueueTicketRow) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Up next
          </p>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] tabular-nums"
          >
            {waitingCount}
          </Badge>
        </div>
        {next ? (
          <p className="mt-1 min-w-0 truncate text-sm">
            <span className="font-semibold tabular-nums">
              {ticketLabel(next.queueNumber, next.ticketCode)}
            </span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-medium">{next.patientName}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Intake clear</p>
        )}
      </div>
      <Button
        size="sm"
        className="w-full shrink-0 sm:w-auto"
        disabled={pending || !next}
        onClick={() => next && onStartIntake(next)}
      >
        <IconHeartbeat className="size-4" aria-hidden />
        Start intake
      </Button>
    </div>
  )
}

export function NurseWorkbench({
  tickets,
  pending,
  onStartIntake,
  className,
  /** `embedded` = strip inside lanes panel; `panel` = flush dashboard cell */
  variant = "embedded",
}: {
  tickets: QueueTicketRow[]
  pending?: boolean
  onStartIntake: (ticket: QueueTicketRow) => void
  className?: string
  variant?: "embedded" | "panel"
}) {
  const next = nextNurseIntakeTicket(tickets)
  const waitingCount = tickets.filter(needsNurseIntake).length

  if (variant === "panel") {
    return (
      <Card className={cn(panelCardClassName, "min-w-0", className)}>
        <CardContent className="py-4">
          <WorkbenchBody
            next={next}
            waitingCount={waitingCount}
            pending={pending}
            onStartIntake={onStartIntake}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div
      className={cn(
        "border-b bg-muted/20 px-4 py-3 sm:px-6",
        className
      )}
    >
      <WorkbenchBody
        next={next}
        waitingCount={waitingCount}
        pending={pending}
        onStartIntake={onStartIntake}
      />
    </div>
  )
}
