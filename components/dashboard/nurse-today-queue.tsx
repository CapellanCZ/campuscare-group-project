"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { appToast } from "@/lib/feedback/app-toast"
import { patientToasts, queueToasts } from "@/lib/feedback/toast-messages"
import {
  IconDots,
  IconListCheck,
} from "@tabler/icons-react"

import { NurseWorkbench } from "@/components/queue/nurse-workbench"
import { WaitStatusBadge } from "@/components/queue/wait-status-badge"
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import { StudentIdSearchInput } from "@/components/shared/student-id-search-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  actionSkipTicket,
  actionVerifyCheckIn,
} from "@/lib/health/queue-server-actions"
import {
  canOpenNurseIntake,
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

const PAGE_SIZE = 8

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
}: {
  access: StaffAccess
  tickets: QueueTicketRow[]
  onStartIntake: (ticket: QueueTicketRow) => void
  className?: string
  dataLoading?: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<TicketStatus | "all" | "intake">("all")
  const [page, setPage] = useState(1)
  const [pending, startTransition] = useTransition()
  const [localTickets, setLocalTickets] = useState(tickets)
  const [profilePatient, setProfilePatient] = useState<PatientRecord | null>(
    null
  )
  const [loadingPatient, setLoadingPatient] = useState(false)

  useEffect(() => {
    setLocalTickets(tickets)
  }, [tickets])

  const canCall = can(access.designation, "queue.call_next")
  const canSkip = can(access.designation, "queue.skip")
  const canVerify = can(access.designation, "queue.verify_check_in")
  const canMutate = canMutateQueue(access.designation)
  const showWalkIn = canRegisterWalkIn(access.designation)

  const filtered = useMemo(() => {
    const q = studentIdDigits(query)
    return localTickets
      .filter((row) => {
        if (status === "intake") return needsNurseIntake(row)
        if (status !== "all" && row.status !== status) return false
        if (!q) return true
        return (
          studentIdMatchesQuery(row.campusId, query) ||
          studentIdMatchesQuery(row.studentId, query)
        )
      })
      .sort((a, b) => {
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
      <NurseWorkbench
        tickets={localTickets}
        pending={pending}
        onStartIntake={onStartIntake}
        variant="embedded"
      />
      <CardHeader className="gap-3 border-b px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Today&apos;s queue</CardTitle>
          </div>
          <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center sm:pt-0.5 [&_a]:flex-1 sm:[&_a]:flex-none [&_button]:flex-1 sm:[&_button]:flex-none">
            {canCall ? (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() =>
                  runAction("Called next patient", () => actionCallNext("nurse"))
                }
              >
                Call next
              </Button>
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
          <select
            aria-label="Filter by status"
            className="h-9 w-full rounded-4xl border border-border bg-input/30 px-3 text-sm sm:w-auto"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status)
              setPage(1)
            }}
          >
            <option value="all">All statuses</option>
            <option value="intake">Needs intake</option>
            <option value="waiting">Waiting</option>
            <option value="called">Called</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        {dataLoading ? (
          <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">#</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Consultation
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6">Actions</TableHead>
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
                      <Skeleton className="h-8 w-8 rounded-md" />
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
          <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">#</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Consult</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Wait</TableHead>
                  <TableHead className="hidden xl:table-cell">Assigned</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.ticketId} className="h-14">
                    <TableCell className="pl-6 font-medium tabular-nums">
                      {ticketLabel(row.queueNumber, row.ticketCode)}
                    </TableCell>
                    <TableCell className="max-w-40 truncate font-medium">
                      {row.patientName}
                      <p className="truncate text-xs font-normal text-muted-foreground">
                        {row.campusId || row.studentId || "—"}
                      </p>
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
                        waitMinutes={row.estimatedWaitMinutes}
                      />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                      {row.estimatedWaitMinutes != null
                        ? `${row.estimatedWaitMinutes}m`
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden max-w-[8rem] truncate text-muted-foreground xl:table-cell">
                      {row.assignedPersonnel || "—"}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {canVerify && needsCheckInVerify(row) ? (
                          <Button
                            type="button"
                            size="xs"
                            disabled={pending}
                            onClick={() =>
                              runAction(
                                "Check-in verified",
                                () => actionVerifyCheckIn(row.ticketId),
                                {
                                  ticketId: row.ticketId,
                                  patch: {
                                    checkedInAt: new Date().toISOString(),
                                  },
                                }
                              )
                            }
                          >
                            Verify
                          </Button>
                        ) : null}
                        {row.checkedInAt && !row.intakeCompletedAt ? (
                          <Badge
                            variant="outline"
                            className="h-6 px-1.5 text-[10px]"
                          >
                            Verified
                          </Badge>
                        ) : null}
                        {needsNurseIntake(row) ? (
                          <Button
                            type="button"
                            size="xs"
                            disabled={pending || !canOpenNurseIntake(row)}
                            title={
                              canOpenNurseIntake(row)
                                ? undefined
                                : "Verify check-in first"
                            }
                            onClick={() => {
                              if (!canOpenNurseIntake(row)) return
                              onStartIntake(row)
                            }}
                          >
                            Intake
                          </Button>
                        ) : null}
                        {canMutate ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-xs"
                                  variant="outline"
                                  aria-label={`Actions for ${row.patientName}`}
                                  disabled={pending}
                                />
                              }
                            >
                              <IconDots className="size-3.5" aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={loadingPatient || pending}
                                onClick={() => {
                                  void openPatientRecord(row)
                                }}
                              >
                                View patient
                              </DropdownMenuItem>
                              {canSkip &&
                              row.status !== "completed" &&
                              row.status !== "expired" ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                      runAction(
                                        "Patient skipped",
                                        () => actionSkipTicket(row.ticketId),
                                        {
                                          ticketId: row.ticketId,
                                          patch: { status: "waiting" },
                                        }
                                      )
                                    }
                                  >
                                    Skip patient
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-sm text-muted-foreground" role="status">
              Page {safePage} of {totalPages}
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
