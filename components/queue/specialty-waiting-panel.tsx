"use client"

import { useEffect, useState } from "react"
import {
  IconAlertTriangle,
  IconBell,
  IconChevronLeft,
  IconChevronRight,
  IconClockHour4,
  IconDots,
  IconEye,
  IconHeartbeat,
  IconPlayerPlay,
} from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { panelCardClassName } from "@/components/layout/panel-frame"
import { AnimatedCount } from "@/components/shared/animated-count"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import type { QueueTicketRow } from "@/lib/health/types"
import { cn } from "@/lib/utils"

const WAITING_PAGE_SIZE = 5

function MetaRow({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate font-medium text-foreground",
          emphasize && "text-destructive"
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  )
}

function WaitingPatientRow({
  index,
  row,
  rowPending,
  onCall,
  onStart,
  onViewDetails,
}: {
  index: number
  row: QueueTicketRow
  rowPending?: boolean
  onCall: (row: QueueTicketRow) => void
  onStart: (row: QueueTicketRow) => void
  onViewDetails: (row: QueueTicketRow) => void
}) {
  const number = ticketLabel(row.queueNumber, row.ticketCode)
  const type = patientTypeLabel(row.patientType) || "—"
  const reason = displayConsultationLabel(
    row.chiefComplaint || row.consultationType,
    row.chiefComplaint
  )
  const isEmergency = row.priority === "urgent"

  return (
    <article className="space-y-3 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className="w-4 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted-foreground"
          aria-hidden
        >
          {index}.
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="min-w-0 text-sm font-semibold leading-snug text-foreground">
              {row.patientName}
            </h4>
            {isEmergency ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-destructive">
                <IconAlertTriangle
                  className="size-3"
                  stroke={1.75}
                  aria-hidden
                />
                Emergency
              </span>
            ) : null}
          </div>
          <div className="space-y-1">
            <MetaRow label="Ticket" value={number} />
            <MetaRow label="Type" value={type} />
            <MetaRow
              label="Reason"
              value={reason}
              emphasize={isEmergency}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5 pl-6">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="size-7"
          disabled={rowPending}
          aria-label={`Call ${row.patientName}`}
          title="Call / recall"
          onClick={() => onCall(row)}
        >
          <IconBell className="size-3.5" stroke={1.75} aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="size-7"
          disabled={rowPending}
          aria-label={`Start visit for ${row.patientName}`}
          title="Start consultation"
          onClick={() => onStart(row)}
        >
          <IconPlayerPlay className="size-3.5" stroke={1.75} aria-hidden />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="size-7"
                disabled={rowPending}
                aria-label={`More actions for ${row.patientName}`}
              />
            }
          >
            <IconDots className="size-3.5" stroke={1.75} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={() => onViewDetails(row)}>
              <IconEye className="size-3.5" stroke={1.75} aria-hidden />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStart(row)}>
              <IconHeartbeat className="size-3.5" stroke={1.75} aria-hidden />
              Start consultation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}

/** Right-rail waiting list for dentist / physician (mirrors nurse Patients panel). */
export function SpecialtyWaitingPanel({
  rows,
  isTicketPending,
  onCall,
  onStart,
  onViewDetails,
  className,
}: {
  rows: QueueTicketRow[]
  isTicketPending?: (ticketId: string) => boolean
  onCall: (row: QueueTicketRow) => void
  onStart: (row: QueueTicketRow) => void
  onViewDetails: (row: QueueTicketRow) => void
  className?: string
}) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(rows.length / WAITING_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(
    safePage * WAITING_PAGE_SIZE,
    safePage * WAITING_PAGE_SIZE + WAITING_PAGE_SIZE
  )

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1))
  }, [page, pageCount])

  useEffect(() => {
    setPage(0)
  }, [rows.length])

  return (
    <Card
      className={cn(
        panelCardClassName,
        "flex h-full flex-col gap-0 py-0",
        className
      )}
    >
      <CardHeader className="shrink-0 border-b px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="inline-flex items-center gap-1.5 text-base">
              <IconClockHour4
                className="size-4 text-muted-foreground"
                stroke={1.75}
                aria-hidden
              />
              Waiting
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ready to call at your station
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            <AnimatedCount value={rows.length} />
            <span>listed</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col p-0">
        {rows.length === 0 ? (
          <Empty className="min-h-[18rem] flex-1 border-0 px-6 py-8">
            <EmptyHeader className="items-center text-center">
              <EmptyMedia variant="icon">
                <IconClockHour4 stroke={1.75} aria-hidden />
              </EmptyMedia>
              <EmptyTitle>No patients waiting</EmptyTitle>
              <EmptyDescription className="text-center">
                After nurse intake assigns a patient to your station, they
                appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="divide-y">
              {pageRows.map((row, index) => (
                <WaitingPatientRow
                  key={row.ticketId}
                  index={safePage * WAITING_PAGE_SIZE + index + 1}
                  row={row}
                  rowPending={isTicketPending?.(row.ticketId)}
                  onCall={onCall}
                  onStart={onStart}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 sm:px-5">
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {safePage * WAITING_PAGE_SIZE + 1}–
                {Math.min(
                  (safePage + 1) * WAITING_PAGE_SIZE,
                  rows.length
                )}{" "}
                of {rows.length}
              </p>
              {pageCount > 1 ? (
                <nav
                  className="flex items-center gap-3"
                  aria-label="Waiting pages"
                >
                  <button
                    type="button"
                    disabled={safePage <= 0}
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
                      "hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    )}
                  >
                    <IconChevronLeft
                      className="size-3.5"
                      stroke={1.75}
                      aria-hidden
                    />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= pageCount - 1}
                    onClick={() =>
                      setPage(Math.min(pageCount - 1, safePage + 1))
                    }
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
                      "hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    )}
                  >
                    Next
                    <IconChevronRight
                      className="size-3.5"
                      stroke={1.75}
                      aria-hidden
                    />
                  </button>
                </nav>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
