"use client"

import { useEffect, useState } from "react"
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconHeartbeat,
  IconUsers,
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
import {
  canOpenNurseIntake,
  needsNurseIntake,
} from "@/lib/health/nurse-queue"
import type { QueueTicketRow } from "@/lib/health/types"
import { cn } from "@/lib/utils"

const PATIENTS_PAGE_SIZE = 3

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

function CalledPatientRow({
  index,
  row,
  rowPending,
  onCall,
  onIntake,
  onViewDetails,
}: {
  index: number
  row: QueueTicketRow
  rowPending?: boolean
  onCall: (row: QueueTicketRow) => void
  onIntake: (row: QueueTicketRow) => void
  onViewDetails: (row: QueueTicketRow) => void
}) {
  const number = ticketLabel(row.queueNumber, row.ticketCode)
  const type = patientTypeLabel(row.patientType) || "—"
  const reason = displayConsultationLabel(
    row.chiefComplaint || row.consultationType,
    row.chiefComplaint
  )
  const isEmergency = row.priority === "urgent"
  const showIntake = needsNurseIntake(row)
  const intakeEnabled = canOpenNurseIntake(row)

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

          <div className="space-y-1 rounded-lg border bg-muted/20 px-2.5 py-2">
            <MetaRow label="Number" value={number} />
            <MetaRow label="Type" value={type} />
            <MetaRow
              label="Reason"
              value={reason && reason !== "—" ? reason : "Not specified"}
              emphasize={isEmergency}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1 pl-6">
        <span className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background px-2 text-[11px] text-muted-foreground">
          <IconCheck className="size-3" stroke={1.75} aria-hidden />
          Checked-in
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="size-7"
          disabled={rowPending}
          aria-label="Call / recall"
          title="Call / recall"
          onClick={() => onCall(row)}
        >
          <IconBell className="size-3.5" stroke={1.75} aria-hidden />
        </Button>
        {showIntake ? (
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 px-2.5"
            disabled={rowPending || !intakeEnabled}
            aria-label="Start intake"
            title={
              intakeEnabled
                ? "Intake & assign specialty"
                : "Complete check-in verify first"
            }
            onClick={() => {
              if (!intakeEnabled) return
              onIntake(row)
            }}
          >
            <IconHeartbeat className="size-3.5" stroke={1.75} aria-hidden />
            Intake
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="More actions"
                disabled={rowPending}
              />
            }
          >
            <IconDots className="size-3.5" stroke={1.75} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(row)}>
              View details
            </DropdownMenuItem>
            {showIntake && intakeEnabled ? (
              <DropdownMenuItem onClick={() => onIntake(row)}>
                Intake & assign specialty
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}

export function NursePatientsPanel({
  rows,
  isTicketPending,
  onCall,
  onIntake,
  onViewDetails,
  className,
}: {
  rows: QueueTicketRow[]
  isTicketPending?: (ticketId: string) => boolean
  onCall: (row: QueueTicketRow) => void
  onIntake: (row: QueueTicketRow) => void
  onViewDetails: (row: QueueTicketRow) => void
  className?: string
}) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(rows.length / PATIENTS_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(
    safePage * PATIENTS_PAGE_SIZE,
    safePage * PATIENTS_PAGE_SIZE + PATIENTS_PAGE_SIZE
  )

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1))
  }, [page, pageCount])

  useEffect(() => {
    setPage(0)
  }, [rows.length])

  return (
    <Card className={cn(panelCardClassName, "gap-0 py-0", className)}>
      <CardHeader className="border-b px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">Patients</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ready for intake
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            <AnimatedCount value={rows.length} />
            <span>listed</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        {rows.length === 0 ? (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconUsers stroke={1.75} aria-hidden />
              </EmptyMedia>
              <EmptyTitle>No checked-in patients</EmptyTitle>
              <EmptyDescription>
                After you call and verify check-in from Waiting, patients
                appear here for intake.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="divide-y">
              {pageRows.map((row, index) => (
                <CalledPatientRow
                  key={row.ticketId}
                  index={safePage * PATIENTS_PAGE_SIZE + index + 1}
                  row={row}
                  rowPending={isTicketPending?.(row.ticketId)}
                  onCall={onCall}
                  onIntake={onIntake}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5 sm:px-5">
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {safePage * PATIENTS_PAGE_SIZE + 1}–
                {Math.min(
                  (safePage + 1) * PATIENTS_PAGE_SIZE,
                  rows.length
                )}{" "}
                of {rows.length}
              </p>
              {pageCount > 1 ? (
                <nav
                  className="flex items-center gap-3"
                  aria-label="Patients pages"
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
