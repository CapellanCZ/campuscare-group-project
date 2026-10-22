"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { appToast } from "@/lib/feedback/app-toast"
import { patientToasts, queueToasts } from "@/lib/feedback/toast-messages"
import {
  IconArrowBackUp,
  IconBell,
  IconCheck,
  IconClipboardList,
  IconEye,
  IconListCheck,
  IconPlayerSkipForward,
} from "@tabler/icons-react"

import { NurseWorkbench } from "@/components/queue/nurse-workbench"
import {
  dedupeNursePatientsByPerson,
  dedupeTicketsById,
} from "@/lib/health/nurse-queue"
import {
  WaitStatusBadge,
  waitTimerSince,
} from "@/components/queue/wait-status-badge"
import { WalkInSheet } from "@/components/queue/walk-in-sheet"
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import { StudentIdSearchInput } from "@/components/shared/student-id-search-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  STATUS_BADGE_DOT,
  STATUS_BADGE_TONE,
} from "@/lib/ui/status-badge-tone"
import { selectItemsRecord } from "@/lib/ui/select-label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { panelCardClassName } from "@/components/layout/panel-frame"
import {
  searchPatientByStudentIdAction,
} from "@/features/patients/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import {
  actionCallNext,
  actionRejoinQueue,
  actionSkipTicket,
  actionVerifyCheckIn,
} from "@/lib/health/queue-server-actions"
import {
  canOpenNurseIntake,
  hasNurseCalledPatient,
  needsCheckInVerify,
  needsNurseIntake,
} from "@/lib/health/nurse-queue"
import { canMutateQueue, canRegisterWalkIn } from "@/lib/health/roles"
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import type { QueueTicketRow, TicketStatus } from "@/lib/health/types"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { studentIdDigits, studentIdMatchesQuery } from "@/lib/students/student-id-input"
import type { PatientRecord } from "@/types/patientRecord"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "intake", label: "Needs intake" },
  { value: "waiting", label: "Waiting" },
  { value: "called", label: "Called" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No show" },
] as const

function consultationLabel(row: QueueTicketRow) {
  const shown = displayConsultationLabel(
    row.consultationType || row.service,
    row.chiefComplaint
  )
  const raw = (row.consultationType || row.service || "").toLowerCase()
  if (row.station === "dentist" || row.providerType === "dentist" || raw.includes("dental")) {
    return shown === "—" || /^other$/i.test(shown) ? "Dental" : shown
  }
  if (raw.includes("medical") || row.station === "physician" || row.providerType === "physician") {
    return shown === "—" || /^other$/i.test(shown) ? "Medical" : shown
  }
  if (raw.includes("walk")) return "Walk-in"
  return shown
}

export function NurseTodayQueue({
  access,
  tickets,
  onStartIntake,
  className,
  dataLoading = false,
  enableWalkIn = true,
}: {
  access: StaffAccess
  tickets: QueueTicketRow[]
  onStartIntake: (ticket: QueueTicketRow) => void
  className?: string
  dataLoading?: boolean
  /** When false (e.g. decorative preview), hide the register walk-in control. */
  enableWalkIn?: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<TicketStatus | "all" | "intake">("all")
  const [page, setPage] = useState(1)
  const [pending, startTransition] = useTransition()
  const [localTickets, setLocalTickets] = useState(() =>
    dedupeTicketsById(tickets)
  )
  const [profilePatient, setProfilePatient] = useState<PatientRecord | null>(
    null
  )
  const [loadingPatient, setLoadingPatient] = useState(false)

  useEffect(() => {
    setLocalTickets(dedupeTicketsById(tickets))
  }, [tickets])

  const canCall = can(access.designation, "queue.call_next")
  const canSkip = can(access.designation, "queue.skip")
  const canVerify = can(access.designation, "queue.verify_check_in")
  const canMutate = canMutateQueue(access.designation)
  const showWalkIn =
    enableWalkIn && canRegisterWalkIn(access.designation)

  const filtered = useMemo(() => {
    const q = studentIdDigits(query)
    const rows = dedupeNursePatientsByPerson(
      localTickets.filter((row) => {
        if (status === "intake") return needsNurseIntake(row)
        if (status !== "all" && row.status !== status) return false
        if (!q) return true
        return (
          studentIdMatchesQuery(row.campusId, query) ||
          studentIdMatchesQuery(row.studentId, query)
        )
      })
    )
    return rows.sort((a, b) => {
      if (a.priority === "urgent" && b.priority !== "urgent") return -1
      if (b.priority === "urgent" && a.priority !== "urgent") return 1
      const aWait = a.estimatedWaitMinutes ?? 0
      const bWait = b.estimatedWaitMinutes ?? 0
      if (a.status === "called" && b.status !== "called") return -1
      if (b.status === "called" && a.status !== "called") return 1
      return bWait - aWait
    })
  }, [localTickets, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )
  const hasCallableWaiting = localTickets.some(
    (ticket) =>
      ticket.status === "waiting" && ticket.station === "nurse"
  )

  function runAction(
    label: string,
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    optimistic?: { ticketId: string; patch: Partial<QueueTicketRow> }
  ) {
    startTransition(async () => {
      const snapshot = localTickets
      if (optimistic) {
        setLocalTickets((prev) =>
          prev.map((row) =>
            row.ticketId === optimistic.ticketId
              ? { ...row, ...optimistic.patch }
              : row
          )
        )
      }
      const result = await action()
      if (!result.ok) {
        if (optimistic) setLocalTickets(snapshot)
        queueToasts.failed(result.error ?? `${label} failed`)
        return
      }
      appToast.success({ title: result.message ?? label })
      router.refresh()
    })
  }

  async function openPatientRecord(row: QueueTicketRow) {
    setLoadingPatient(true)
    try {
      const campusId = (row.campusId || row.studentId || "").trim()
      if (!campusId) {
        patientToasts.failed(
          "No ID Number on this queue entry — cannot open medical records."
        )
        return
      }

      const result = await searchPatientByStudentIdAction(campusId)
      if (!result.ok) {
        patientToasts.failed(
          result.error || "No patient medical record found for this queue entry."
        )
        return
      }

      setProfilePatient(result.data)
    } catch {
      patientToasts.failed("Could not load patient medical record.")
    } finally {
      setLoadingPatient(false)
    }
  }

  return (
    <Card className={cn(panelCardClassName, "gap-0 py-0", className)}>
      <NurseWorkbench tickets={localTickets} variant="embedded" />
      <CardHeader className="gap-4 border-b px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg">
            Today&apos;s queue
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {canCall ? (
              <Button
                type="button"
                size="sm"
                disabled={pending || !hasCallableWaiting}
                title={
                  hasCallableWaiting
                    ? "Call next waiting patient"
                    : "No waiting patients to call"
                }
                onClick={() => {
                  if (!hasCallableWaiting) return
                  runAction("Called next patient", () =>
                    actionCallNext("nurse")
                  )
                }}
              >
                <IconBell data-icon="inline-start" className="size-4" aria-hidden />
                Call next
              </Button>
            ) : null}
            {showWalkIn ? (
              <WalkInSheet
                onRegistered={() => {
                  router.refresh()
                }}
              />
            ) : null}
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/nurse/queue" />}
              nativeButton={false}
            >
              Open queue
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <StudentIdSearchInput
            className="min-w-0 w-full flex-1"
            value={query}
            onChange={(next) => {
              setQuery(next)
              setPage(1)
            }}
            placeholder="Search by ID Number"
            aria-label="Search by ID Number"
          />
          <Select
            value={status}
            items={selectItemsRecord([...STATUS_FILTER_OPTIONS])}
            onValueChange={(value) => {
              if (!value) return
              setStatus(value as typeof status)
              setPage(1)
            }}
          >
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        {dataLoading ? (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">#</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Consult</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Assigned</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[0, 1, 2].map((row) => (
                  <TableRow className="h-14" key={row}>
                    <TableCell className="pl-6">
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell className="pr-6">
                      <Skeleton className="ml-auto h-7 w-16 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : pageRows.length === 0 ? (
          <Empty className="border-0 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconListCheck aria-hidden />
              </EmptyMedia>
              <EmptyTitle>Queue is clear</EmptyTitle>
              <EmptyDescription>
                {showWalkIn
                  ? "Register a walk-in or wait for the next check-in."
                  : "No tickets match this filter."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">#</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Consult</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Assigned</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => {
                  const canSkipRow =
                    canSkip &&
                    row.status !== "completed" &&
                    row.status !== "no_show" &&
                    row.status !== "expired"
                  const canRejoinRow =
                    canMutate &&
                    (row.status === "no_show" || row.status === "expired") &&
                    row.canRejoin

                  return (
                    <TableRow key={row.ticketId} className="h-14">
                      <TableCell className="pl-6 font-medium tabular-nums">
                        {ticketLabel(row.queueNumber, row.ticketCode)}
                      </TableCell>
                      <TableCell className="max-w-48">
                        <div className="flex min-w-0 items-start gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate font-medium">
                                {row.patientName}
                              </p>
                              {row.priority === "urgent" ? (
                                <StatusBadge
                                  label="Emergency"
                                  toneClassName={STATUS_BADGE_TONE.cancelled}
                                  dotClassName={STATUS_BADGE_DOT.cancelled}
                                  className="h-5 shrink-0 px-1.5 text-[10px]"
                                />
                              ) : null}
                            </div>
                            <p className="truncate text-xs font-normal text-muted-foreground">
                              {row.campusId || row.studentId || "—"}
                            </p>
                          </div>
                          {canMutate ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              className="mt-0.5 size-7 shrink-0 text-muted-foreground"
                              disabled={loadingPatient || pending}
                              aria-label={`View ${row.patientName}`}
                              title="View patient"
                              onClick={() => {
                                void openPatientRecord(row)
                              }}
                            >
                              <IconEye className="size-4" aria-hidden />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">
                          {patientTypeLabel(row.patientType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden max-w-[8rem] truncate md:table-cell">
                        {consultationLabel(row)}
                      </TableCell>
                      <TableCell>
                        <WaitStatusBadge
                          status={row.status}
                          since={waitTimerSince(row)}
                        />
                      </TableCell>
                      <TableCell className="hidden max-w-[8rem] truncate text-muted-foreground xl:table-cell">
                        {row.assignedPersonnel || "—"}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {canVerify && needsCheckInVerify(row) ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              className="size-7"
                              disabled={
                                pending || !hasNurseCalledPatient(row)
                              }
                              aria-label="Verify check-in"
                              title={
                                hasNurseCalledPatient(row)
                                  ? "Verify"
                                  : "Call the patient first"
                              }
                              onClick={() => {
                                if (!hasNurseCalledPatient(row)) return
                                runAction(
                                  "Check-in verified",
                                  () => actionVerifyCheckIn(row.ticketId),
                                  {
                                    ticketId: row.ticketId,
                                    patch: {
                                      checkedInAt: new Date().toISOString(),
                                      status: "waiting",
                                      station: "nurse",
                                    },
                                  }
                                )
                              }}
                            >
                              <IconCheck className="size-3.5" aria-hidden />
                            </Button>
                          ) : null}
                          {row.checkedInAt && !row.intakeCompletedAt ? (
                            <StatusBadge
                              label="Checked-in"
                              toneClassName={STATUS_BADGE_TONE.completed}
                              dotClassName={STATUS_BADGE_DOT.completed}
                              className="h-6 px-1.5 text-[10px] normal-case"
                            />
                          ) : null}
                          {needsNurseIntake(row) ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              className="size-7"
                              disabled={pending || !canOpenNurseIntake(row)}
                              aria-label="Start intake"
                              title={
                                canOpenNurseIntake(row)
                                  ? "Intake"
                                  : "Verify check-in first"
                              }
                              onClick={() => {
                                if (!canOpenNurseIntake(row)) return
                                onStartIntake(row)
                              }}
                            >
                              <IconClipboardList
                                className="size-3.5"
                                aria-hidden
                              />
                            </Button>
                          ) : null}
                          {canSkipRow ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="destructive"
                              className="size-7"
                              disabled={pending}
                              aria-label={`Skip ${row.patientName}`}
                              title="Skip patient"
                              onClick={() =>
                                runAction(
                                  "Patient skipped — open Exceptions to rejoin",
                                  () => actionSkipTicket(row.ticketId),
                                  {
                                    ticketId: row.ticketId,
                                    patch: {
                                      status: "no_show",
                                      estimatedWaitMinutes: 0,
                                      canRejoin: row.rejoinCount < 1,
                                    },
                                  }
                                )
                              }
                            >
                              <IconPlayerSkipForward
                                className="size-3.5"
                                aria-hidden
                              />
                            </Button>
                          ) : null}
                          {canRejoinRow ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              className="size-7"
                              disabled={pending}
                              aria-label={`Rejoin ${row.patientName}`}
                              title="Rejoin end of queue"
                              onClick={() =>
                                runAction(
                                  "Patient rejoined at end of queue",
                                  () => actionRejoinQueue(row.ticketId),
                                  {
                                    ticketId: row.ticketId,
                                    patch: {
                                      status: "waiting",
                                      rejoinCount: row.rejoinCount + 1,
                                      canRejoin: false,
                                    },
                                  }
                                )
                              }
                            >
                              <IconArrowBackUp
                                className="size-3.5"
                                aria-hidden
                              />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
            <p className="text-sm text-muted-foreground" role="status">
              Page {safePage} of {totalPages} · {filtered.length} tickets
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage <= 1 || pending}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages || pending}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>

      <PatientProfileSheet
        patient={profilePatient}
        open={Boolean(profilePatient)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setProfilePatient(null)
        }}
      />
    </Card>
  )
}
