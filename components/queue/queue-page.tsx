"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  actionAssignQueueNumber,
  actionCallNext,
  actionCompleteTicket,
  actionNoShowTicket,
  actionRecallTicket,
  actionRejoinQueue,
  actionSkipTicket,
  actionStartConsultation,
  actionTransferTicket,
  actionVerifyCheckIn,
} from "@/lib/health/queue-server-actions"
import { NurseIntakeSheet } from "@/components/queue/nurse-intake-sheet"
import { VitalsStrip } from "@/components/queue/vitals-strip"
import { WalkInSheet } from "@/components/queue/walk-in-sheet"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { RecentlyServedCard } from "@/components/shared/recently-served-card"
import { StatCard } from "@/components/shared/stat-card"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { StaffAccess } from "@/lib/auth/types"
import { ticketLabel } from "@/lib/health/mappers"
import {
  canMutateQueue,
  canRegisterWalkIn,
  canTransferQueue,
  designationLabel,
  isReadOnlyQueue,
  stationForDesignation,
  stationLabel,
} from "@/lib/health/roles"
import type {
  ActivityItem,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
  StationId,
  TicketStatus,
} from "@/lib/health/types"
import { IconDots, IconRefresh, IconUsers } from "@tabler/icons-react"
import { useRouter } from "next/navigation"

export function QueuePage({
  access,
  tickets,
  stats,
  boards,
  recent,
  activity,
}: {
  access: StaffAccess
  tickets: QueueTicketRow[]
  stats: QueueStats
  boards: StationBoard[]
  recent: RecentlyServedItem[]
  activity: ActivityItem[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stationFilter, setStationFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [intakeTicket, setIntakeTicket] = useState<QueueTicketRow | null>(null)
  const pageSize = 8

  const readOnly = isReadOnlyQueue(access.designation)
  const canMutate = canMutateQueue(access.designation)
  const myStation = stationForDesignation(access.designation)

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        t.patientName.toLowerCase().includes(q) ||
        (t.campusId ?? "").toLowerCase().includes(q) ||
        t.ticketCode.toLowerCase().includes(q) ||
        String(t.queueNumber ?? "").includes(q)
      const matchesStatus =
        statusFilter === "all" || t.status === (statusFilter as TicketStatus)
      const matchesStation =
        stationFilter === "all" || t.station === stationFilter
      return matchesQuery && matchesStatus && matchesStation
    })
  }, [tickets, query, statusFilter, stationFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize)

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error ?? "Action failed")
        return
      }
      toast.success(result.message ?? "Updated")
      router.refresh()
    })
  }

  const cards =
    access.designation === "admin"
      ? [
          { label: "Total waiting", value: String(stats.totalWaiting) },
          { label: "Currently serving", value: String(stats.currentlyServing) },
          { label: "Completed today", value: String(stats.completedToday) },
          {
            label: "Average waiting time",
            value: `${stats.averageWaitMinutes} min`,
          },
        ]
      : access.designation === "nurse"
        ? [
            { label: "Waiting patients", value: String(stats.totalWaiting) },
            { label: "Checked-in patients", value: String(stats.checkedIn) },
            { label: "Walk-in patients", value: String(stats.walkIns) },
            { label: "Currently serving", value: String(stats.currentlyServing) },
            { label: "Completed today", value: String(stats.completedToday) },
          ]
        : [
            { label: "Waiting patients", value: String(stats.totalWaiting) },
            {
              label: "Current patient",
              value: (() => {
                const current = tickets.find((t) => t.status === "called")
                return current
                  ? ticketLabel(current.queueNumber, current.ticketCode)
                  : "—"
              })(),
            },
            { label: "Completed today", value: String(stats.completedToday) },
          ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Queue management</h1>
          <p className="text-sm text-muted-foreground">
            {designationLabel(access.designation)}
            {readOnly ? " · monitoring only" : " · live controls"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRegisterWalkIn(access.designation) ? <WalkInSheet /> : null}
          {canMutate ? (
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  actionCallNext(
                    access.designation === "admin"
                      ? undefined
                      : (myStation ?? "nurse")
                  )
                )
              }
            >
              Call next
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh queue"
            disabled={pending}
            onClick={() => router.refresh()}
          >
            <IconRefresh />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="gap-3 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">Live queue</CardTitle>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Input
                className="sm:max-w-xs"
                placeholder="Search ticket or patient"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value ?? "all")
                  setPage(0)
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="called">Called</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no_show">No-show</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              {access.designation === "admin" || access.designation === "nurse" ? (
                <Select
                  value={stationFilter}
                  onValueChange={(value) => {
                    setStationFilter(value ?? "all")
                    setPage(0)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Station" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stations</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="physician">Physician</SelectItem>
                    <SelectItem value="dentist">Dentist</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pageRows.length === 0 ? (
            <Empty className="py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconUsers />
                </EmptyMedia>
                <EmptyTitle>No tickets match</EmptyTitle>
                <EmptyDescription>
                  Adjust filters or register a walk-in patient.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Vitals</TableHead>
                  <TableHead className="hidden sm:table-cell">Station</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Wait</TableHead>
                  {!readOnly ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.ticketId}>
                    <TableCell className="font-semibold tabular-nums">
                      {ticketLabel(row.queueNumber, row.ticketCode)}
                    </TableCell>
                    <TableCell className="max-w-[9rem] truncate">
                      <p className="truncate font-medium">{row.patientName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.campusId ?? "No campus ID"}
                        {row.callCount > 0 ? ` · call ${row.callCount}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="hidden max-w-[9rem] truncate md:table-cell">
                      {row.consultationType}
                    </TableCell>
                    <TableCell className="hidden min-w-44 lg:table-cell">
                      <VitalsStrip
                        vitals={row.vitals}
                        chiefComplaint={row.chiefComplaint}
                        dense
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {stationLabel(row.station)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell tabular-nums">
                      {row.estimatedWaitMinutes != null
                        ? `${row.estimatedWaitMinutes}m`
                        : "—"}
                    </TableCell>
                    {!readOnly ? (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Queue actions"
                                disabled={pending}
                              />
                            }
                          >
                            <IconDots />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {access.designation === "nurse" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    run(() => actionVerifyCheckIn(row.ticketId))
                                  }
                                >
                                  Verify check-in
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setIntakeTicket(row)}
                                >
                                  Intake & assign specialty
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const n = window.prompt(
                                      "Assign queue number",
                                      String(row.queueNumber ?? row.queuePosition)
                                    )
                                    const parsed = Number(n)
                                    if (!n || Number.isNaN(parsed)) return
                                    run(() =>
                                      actionAssignQueueNumber(row.ticketId, parsed)
                                    )
                                  }}
                                >
                                  Assign queue number
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            ) : null}
                            <DropdownMenuItem
                              onClick={() =>
                                run(() => actionRecallTicket(row.ticketId))
                              }
                            >
                              Call / recall
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                run(() => actionStartConsultation(row.ticketId))
                              }
                            >
                              Start consultation
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                run(() => actionCompleteTicket(row.ticketId))
                              }
                            >
                              Complete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                run(() => actionSkipTicket(row.ticketId))
                              }
                            >
                              Skip
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={row.callCount < 2}
                              onClick={() =>
                                run(() => actionNoShowTicket(row.ticketId))
                              }
                            >
                              Mark no-show
                              {row.callCount < 2 ? " (need 2 calls)" : ""}
                            </DropdownMenuItem>
                            {row.canRejoin ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  run(() => actionRejoinQueue(row.ticketId))
                                }
                              >
                                Rejoin end of queue
                              </DropdownMenuItem>
                            ) : null}
                            {canTransferQueue(access.designation) ? (
                              <>
                                <DropdownMenuSeparator />
                                {(
                                  ["physician", "dentist", "nurse"] as StationId[]
                                ).map((station) => (
                                  <DropdownMenuItem
                                    key={station}
                                    onClick={() =>
                                      run(() =>
                                        actionTransferTicket(row.ticketId, station)
                                      )
                                    }
                                  >
                                    Transfer to {stationLabel(station)}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {filtered.length} ticket{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 shadow-none dark:ring-0">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Station load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-(--card-spacing)">
            {boards.map((board) => (
              <div
                key={board.station}
                className="rounded-xl bg-muted/50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{board.label}</p>
                  <Badge variant="outline">{board.waitingCount} waiting</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Now serving {board.nowServing ?? "—"} · ~{board.averageWaitMinutes}{" "}
                  min
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <ActivityFeed items={activity} title="Queue timeline" />
        <Card className="min-w-0 shadow-none dark:ring-0">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Recently served</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-(--card-spacing)">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completions yet.</p>
            ) : (
              recent.map((item) => (
                <RecentlyServedCard key={item.ticketId} item={item} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <NurseIntakeSheet
        ticket={intakeTicket}
        open={Boolean(intakeTicket)}
        onOpenChange={(open) => {
          if (!open) setIntakeTicket(null)
        }}
      />
    </div>
  )
}
