"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconDots,
  IconListCheck,
  IconSearch,
} from "@tabler/icons-react"

import { NurseWorkbench } from "@/components/queue/nurse-workbench"
import { WaitStatusBadge } from "@/components/queue/wait-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { panelCardClassName } from "@/components/layout/panel-frame"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import {
  actionCallNext,
  actionSkipTicket,
  actionVerifyCheckIn,
} from "@/lib/health/queue-server-actions"
import { needsNurseIntake } from "@/lib/health/nurse-queue"
import { canMutateQueue, canRegisterWalkIn } from "@/lib/health/roles"
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import type { QueueTicketRow, TicketStatus } from "@/lib/health/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 8

function consultationLabel(row: QueueTicketRow) {
  const raw = (row.consultationType || row.service || "").toLowerCase()
  if (row.station === "dentist" || raw.includes("dental")) return "Dental"
  if (raw.includes("medical") || row.station === "physician") return "Medical"
  if (raw.includes("walk")) return "Walk-in"
  return row.consultationType || row.service || "General"
}

export function NurseTodayQueue({
  access,
  tickets,
  onStartIntake,
  className,
}: {
  access: StaffAccess
  tickets: QueueTicketRow[]
  onStartIntake: (ticket: QueueTicketRow) => void
  className?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<TicketStatus | "all" | "intake">("all")
  const [page, setPage] = useState(1)
  const [pending, startTransition] = useTransition()

  const canCall = can(access.designation, "queue.call_next")
  const canSkip = can(access.designation, "queue.skip")
  const canVerify = can(access.designation, "queue.verify_check_in")
  const canMutate = canMutateQueue(access.designation)
  const showWalkIn = canRegisterWalkIn(access.designation)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets
      .filter((row) => {
        if (status === "intake") return needsNurseIntake(row)
        if (status !== "all" && row.status !== status) return false
        if (!q) return true
        return (
          row.patientName.toLowerCase().includes(q) ||
          (row.campusId ?? "").toLowerCase().includes(q) ||
          (row.studentId ?? "").toLowerCase().includes(q) ||
          ticketLabel(row.queueNumber, row.ticketCode).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const aWait = a.estimatedWaitMinutes ?? 0
        const bWait = b.estimatedWaitMinutes ?? 0
        if (a.status === "called" && b.status !== "called") return -1
        if (b.status === "called" && a.status !== "called") return 1
        return bWait - aWait
      })
  }, [tickets, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  function runAction(
    label: string,
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>
  ) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error ?? `${label} failed`)
        return
      }
      toast.success(result.message ?? label)
      router.refresh()
    })
  }

  return (
    <Card className={cn(panelCardClassName, "gap-0 py-0", className)}>
      <NurseWorkbench
        tickets={tickets}
        pending={pending}
        onStartIntake={onStartIntake}
        variant="embedded"
      />
      <CardHeader className="gap-4 border-b px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Today&apos;s queue</CardTitle>
            <CardDescription>
              Call, verify, intake, or skip from one board.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:pt-0.5">
            <Badge variant="secondary" className="tabular-nums">
              {filtered.length}
            </Badge>
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
              render={<Link href="/nurse/queue-management" />}
              nativeButton={false}
            >
              Open queue
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <IconSearch
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-8"
              placeholder="Search name, ID, or ticket"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              aria-label="Search today's queue"
            />
          </div>
          <select
            aria-label="Filter by status"
            className="h-9 rounded-4xl border border-border bg-input/30 px-3 text-sm"
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
        {pageRows.length === 0 ? (
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
                        {needsNurseIntake(row) ? (
                          <Button
                            type="button"
                            size="xs"
                            disabled={pending}
                            onClick={() => onStartIntake(row)}
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
                              {canVerify && !row.checkedInAt ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    runAction("Check-in verified", () =>
                                      actionVerifyCheckIn(row.ticketId)
                                    )
                                  }
                                >
                                  Verify check-in
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                render={
                                  <Link
                                    href={`/nurse/patient-records?q=${encodeURIComponent(
                                      row.campusId ||
                                        row.studentId ||
                                        row.patientName
                                    )}`}
                                  />
                                }
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
                                      runAction("Patient skipped", () =>
                                        actionSkipTicket(row.ticketId)
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
    </Card>
  )
}
