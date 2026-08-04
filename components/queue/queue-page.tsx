"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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
import { NurseLaneSwitcher } from "@/components/queue/nurse-lane-switcher"
import { NurseWorkbench } from "@/components/queue/nurse-workbench"
import { VitalsStrip } from "@/components/queue/vitals-strip"
import { WaitStatusBadge } from "@/components/queue/wait-status-badge"
import { WalkInSheet } from "@/components/queue/walk-in-sheet"
import { StudentIdSearchInput } from "@/components/shared/student-id-search-input"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { RecentlyServedCard } from "@/components/shared/recently-served-card"
import { StatCard } from "@/components/shared/stat-card"
import {
  PageIntro,
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import {
  DirectoryColumnHeader,
  DirectoryColumnLabel,
  type ColumnSortDirection,
} from "@/features/admin/components/directory-column-header"
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { StaffAccess } from "@/lib/auth/types"
import { ticketLabel, patientTypeLabel } from "@/lib/health/mappers"
import {
  needsNurseIntake,
  ticketsInNurseLane,
  type NurseQueueLane,
} from "@/lib/health/nurse-queue"
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
  PatientType,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  SpecialtyStationId,
  StationBoard,
  StationId,
  TicketStatus,
} from "@/lib/health/types"
import { studentIdMatchesQuery } from "@/lib/students/student-id-input"
import { cn } from "@/lib/utils"
import { IconDots, IconRefresh, IconSearch } from "@tabler/icons-react"

type QueueSortColumn =
  | "ticket"
  | "patient"
  | "type"
  | "status"
  | "consultation"
  | "station"
  | "wait"

const STATUS_OPTIONS: Array<{ value: TicketStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "waiting", label: "Waiting" },
  { value: "called", label: "Called" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
  { value: "expired", label: "Expired" },
]

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
  const [localTickets, setLocalTickets] = useState(tickets)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stationFilter, setStationFilter] = useState<string>("all")
  const [patientTypeFilter, setPatientTypeFilter] = useState<
    PatientType | "all"
  >("all")
  const [consultationFilter, setConsultationFilter] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<QueueSortColumn>("ticket")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("asc")
  const [nurseLane, setNurseLane] = useState<NurseQueueLane>("needs_intake")
  const [page, setPage] = useState(0)
  const [intakeTicket, setIntakeTicket] = useState<QueueTicketRow | null>(null)
  const pageSize = 8

  useEffect(() => {
    setLocalTickets(tickets)
  }, [tickets])

  const readOnly = isReadOnlyQueue(access.designation)
  const canMutate = canMutateQueue(access.designation)
  const myStation = stationForDesignation(access.designation)
  const isNurse = access.designation === "nurse"
  const isPhysician = access.designation === "physician"
  const isSpecialtyStation =
    access.designation === "physician" || access.designation === "dentist"

  function setColumnSort(column: QueueSortColumn, direction: ColumnSortDirection) {
    setSortColumn(column)
    setSortDirection(direction)
  }

  function sortDirectionFor(column: QueueSortColumn): ColumnSortDirection {
    return sortColumn === column ? sortDirection : false
  }

  const consultationOptions = useMemo(() => {
    const values = new Set<string>()
    for (const ticket of localTickets) {
      const value = ticket.consultationType?.trim()
      if (value) values.add(value)
    }
    return [...values].sort((a, b) => a.localeCompare(b))
  }, [localTickets])

  const filtered = useMemo(() => {
    let rows = localTickets
    if (isNurse) rows = ticketsInNurseLane(rows, nurseLane)
    const next = rows.filter((t) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        isNurse || isPhysician
          ? !q ||
            studentIdMatchesQuery(t.campusId, query) ||
            studentIdMatchesQuery(t.studentId, query)
          : !q ||
            t.patientName.toLowerCase().includes(q) ||
            (t.campusId ?? "").toLowerCase().includes(q) ||
            t.ticketCode.toLowerCase().includes(q) ||
            String(t.queueNumber ?? "").includes(q)
      const matchesStatus =
        statusFilter === "all" || t.status === (statusFilter as TicketStatus)
      const matchesStation =
        stationFilter === "all" || t.station === stationFilter
      const matchesType =
        patientTypeFilter === "all" || t.patientType === patientTypeFilter
      const matchesConsultation =
        consultationFilter === "all" ||
        (t.consultationType ?? "") === consultationFilter
      return (
        matchesQuery &&
        matchesStatus &&
        matchesStation &&
        matchesType &&
        matchesConsultation
      )
    })

    const direction = sortDirection === "desc" ? -1 : 1
    return [...next].sort((a, b) => {
      let compare = 0
      if (sortColumn === "ticket") {
        compare = (a.queueNumber ?? 0) - (b.queueNumber ?? 0)
      } else if (sortColumn === "patient") {
        compare = a.patientName.localeCompare(b.patientName)
      } else if (sortColumn === "type") {
        compare = (a.patientType ?? "").localeCompare(b.patientType ?? "")
      } else if (sortColumn === "status") {
        compare = a.status.localeCompare(b.status)
      } else if (sortColumn === "consultation") {
        compare = (a.consultationType ?? "").localeCompare(
          b.consultationType ?? ""
        )
      } else if (sortColumn === "station") {
        compare = a.station.localeCompare(b.station)
      } else {
        compare =
          (a.estimatedWaitMinutes ?? -1) - (b.estimatedWaitMinutes ?? -1)
      }
      if (compare === 0) {
        compare = a.patientName.localeCompare(b.patientName)
      }
      return compare * direction
    })
  }, [
    localTickets,
    query,
    statusFilter,
    stationFilter,
    patientTypeFilter,
    consultationFilter,
    isNurse,
    isPhysician,
    nurseLane,
    sortColumn,
    sortDirection,
  ])

  const laneCounts = useMemo(
    () => ({
      needs_intake: ticketsInNurseLane(localTickets, "needs_intake").length,
      at_specialty: ticketsInNurseLane(localTickets, "at_specialty").length,
      exceptions: ticketsInNurseLane(localTickets, "exceptions").length,
    }),
    [localTickets]
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize)

  function run(
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>
  ) {
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

  function applyOptimisticAssign(
    ticketId: string,
    toStation: SpecialtyStationId
  ) {
    setLocalTickets((prev) =>
      prev.map((row) =>
        row.ticketId === ticketId
          ? {
              ...row,
              station: toStation,
              intakeCompletedAt: new Date().toISOString(),
              status: "waiting" as const,
            }
          : row
      )
    )
  }

  const cards =
    access.designation === "admin"
      ? [
          { label: "Total waiting", value: String(stats.totalWaiting) },
          {
            label: "Currently serving",
            value: String(stats.currentlyServing),
          },
          { label: "Completed today", value: String(stats.completedToday) },
        ]
      : [
          { label: "Waiting", value: String(stats.totalWaiting) },
          {
            label: "Current",
            value: (() => {
              const current = localTickets.find((t) => t.status === "called")
              return current
                ? ticketLabel(current.queueNumber, current.ticketCode)
                : "—"
            })(),
          },
          { label: "Completed today", value: String(stats.completedToday) },
        ]

  return (
    <div
      className={
        isPhysician
          ? "flex flex-1 flex-col gap-10 pt-2"
          : "flex flex-1 flex-col gap-8 pt-2"
      }
    >
      <PageIntro
        title={
          isNurse
            ? "Nurse queue"
            : isPhysician
              ? "Your station queue"
              : access.designation === "dentist"
                ? "Dental queue"
                : "Queue management"
        }
        description={
          isNurse || isPhysician
            ? undefined
            : `${designationLabel(access.designation)}${
                readOnly
                  ? " · monitoring only"
                  : access.designation === "dentist"
                    ? " · dental patients only"
                    : " · live controls"
              }`
        }
        action={
          <>
            {canRegisterWalkIn(access.designation) ? <WalkInSheet /> : null}
            {canMutate ? (
              <Button
                size="sm"
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
              size="icon-sm"
              aria-label="Refresh queue"
              disabled={pending}
              onClick={() => router.refresh()}
            >
              <IconRefresh />
            </Button>
          </>
        }
      />

      <PanelFrame>
        <PanelGrid className="lg:grid-cols-3">
          {isNurse ? (
            <PanelCell className="lg:col-span-3">
              <NurseLaneSwitcher
                value={nurseLane}
                counts={laneCounts}
                onChange={(lane) => {
                  setNurseLane(lane)
                  setPage(0)
                }}
              />
            </PanelCell>
          ) : isPhysician ? null : (
            cards.map((card) => (
              <PanelCell key={card.label}>
                <StatCard flush label={card.label} value={card.value} />
              </PanelCell>
            ))
          )}

          <PanelCell className="lg:col-span-3">
            <Card className={cn(panelCardClassName, "gap-0 py-0")}>
              <div className="flex flex-col gap-4 border-b px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base">
                    {isNurse
                      ? nurseLane === "needs_intake"
                        ? "Needs intake"
                        : nurseLane === "at_specialty"
                          ? "Specialty queue"
                          : "Exceptions"
                      : "Live queue"}
                  </CardTitle>
                </div>
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                  {isNurse || isPhysician ? (
                    <StudentIdSearchInput
                      className="sm:w-56"
                      inputClassName="h-9"
                      value={query}
                      onChange={(next) => {
                        setQuery(next)
                        setPage(0)
                      }}
                      placeholder="Search by ID Number"
                      aria-label="Search by ID Number"
                    />
                  ) : (
                    <InputGroup className="h-9 sm:w-56">
                      <InputGroupAddon align="inline-start">
                        <IconSearch className="size-4 opacity-60" aria-hidden />
                      </InputGroupAddon>
                      <InputGroupInput
                        placeholder="Search ticket or patient"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value)
                          setPage(0)
                        }}
                        aria-label="Search ticket or patient"
                      />
                    </InputGroup>
                  )}
                </div>
              </div>

              {isNurse && nurseLane === "needs_intake" ? (
                <NurseWorkbench
                  tickets={localTickets}
                  pending={pending}
                  onStartIntake={setIntakeTicket}
                />
              ) : null}

              <CardContent className="px-0 pb-0">
                {pageRows.length === 0 ? (
                  <p className="px-6 py-10 text-sm text-muted-foreground">
                    {isNurse && nurseLane === "needs_intake"
                      ? "No patients waiting for intake."
                      : "No tickets match these filters."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-12 pl-6">
                          <DirectoryColumnHeader
                            title="#"
                            sortDirection={sortDirectionFor("ticket")}
                            onSortAsc={() => setColumnSort("ticket", "asc")}
                            onSortDesc={() => setColumnSort("ticket", "desc")}
                            onClearSort={() => setColumnSort("ticket", "asc")}
                          />
                        </TableHead>
                        <TableHead className="h-12">
                          <DirectoryColumnHeader
                            title="Patient"
                            sortDirection={sortDirectionFor("patient")}
                            onSortAsc={() => setColumnSort("patient", "asc")}
                            onSortDesc={() => setColumnSort("patient", "desc")}
                            onClearSort={() => setColumnSort("patient", "asc")}
                          />
                        </TableHead>
                        {isNurse ? (
                          <>
                            <TableHead className="hidden h-12 md:table-cell">
                              <DirectoryColumnLabel title="ID" />
                            </TableHead>
                            <TableHead className="hidden h-12 lg:table-cell">
                              <DirectoryColumnHeader
                                title="Consultation"
                                sortDirection={sortDirectionFor("consultation")}
                                onSortAsc={() =>
                                  setColumnSort("consultation", "asc")
                                }
                                onSortDesc={() =>
                                  setColumnSort("consultation", "desc")
                                }
                                onClearSort={() => {
                                  setColumnSort("ticket", "asc")
                                  setConsultationFilter("all")
                                  setPage(0)
                                }}
                                filterLabel="Consultation"
                                filterItems={
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setConsultationFilter("all")
                                        setPage(0)
                                      }}
                                      className={cn(
                                        consultationFilter === "all" &&
                                          "bg-accent"
                                      )}
                                    >
                                      All consultations
                                    </DropdownMenuItem>
                                    {consultationOptions.map((option) => (
                                      <DropdownMenuItem
                                        key={option}
                                        onClick={() => {
                                          setConsultationFilter(option)
                                          setPage(0)
                                        }}
                                        className={cn(
                                          consultationFilter === option &&
                                            "bg-accent"
                                        )}
                                      >
                                        {option}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                }
                              />
                            </TableHead>
                            <TableHead className="h-12">
                              <DirectoryColumnHeader
                                title="Type"
                                sortDirection={sortDirectionFor("type")}
                                onSortAsc={() => setColumnSort("type", "asc")}
                                onSortDesc={() => setColumnSort("type", "desc")}
                                onClearSort={() => {
                                  setColumnSort("ticket", "asc")
                                  setPatientTypeFilter("all")
                                  setPage(0)
                                }}
                                filterLabel="Type"
                                filterItems={
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setPatientTypeFilter("all")
                                        setPage(0)
                                      }}
                                      className={cn(
                                        patientTypeFilter === "all" &&
                                          "bg-accent"
                                      )}
                                    >
                                      All types
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setPatientTypeFilter("student")
                                        setPage(0)
                                      }}
                                      className={cn(
                                        patientTypeFilter === "student" &&
                                          "bg-accent"
                                      )}
                                    >
                                      Students
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setPatientTypeFilter("faculty")
                                        setPage(0)
                                      }}
                                      className={cn(
                                        patientTypeFilter === "faculty" &&
                                          "bg-accent"
                                      )}
                                    >
                                      Faculty
                                    </DropdownMenuItem>
                                  </>
                                }
                              />
                            </TableHead>
                            <TableHead className="h-12">
                              <DirectoryColumnHeader
                                title="Status"
                                sortDirection={sortDirectionFor("status")}
                                onSortAsc={() => setColumnSort("status", "asc")}
                                onSortDesc={() =>
                                  setColumnSort("status", "desc")
                                }
                                onClearSort={() => {
                                  setColumnSort("ticket", "asc")
                                  setStatusFilter("all")
                                  setPage(0)
                                }}
                                filterLabel="Status"
                                filterItems={
                                  <>
                                    {STATUS_OPTIONS.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => {
                                          setStatusFilter(option.value)
                                          setPage(0)
                                        }}
                                        className={cn(
                                          statusFilter === option.value &&
                                            "bg-accent"
                                        )}
                                      >
                                        {option.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                }
                              />
                            </TableHead>
                          </>
                        ) : isSpecialtyStation ? (
                          <>
                            <TableHead className="hidden h-12 sm:table-cell">
                              <DirectoryColumnHeader
                                title="Type"
                                sortDirection={sortDirectionFor("type")}
                                onSortAsc={() => setColumnSort("type", "asc")}
                                onSortDesc={() => setColumnSort("type", "desc")}
                                onClearSort={() => {
                                  setColumnSort("ticket", "asc")
                                  setPatientTypeFilter("all")
                                  setPage(0)
                                }}
                              />
                            </TableHead>
                            <TableHead className="hidden h-12 md:table-cell">
                              <DirectoryColumnLabel title="Chief complaint" />
                            </TableHead>
                            <TableHead className="h-12">
                              <DirectoryColumnHeader
                                title="Status"
                                sortDirection={sortDirectionFor("status")}
                                onSortAsc={() => setColumnSort("status", "asc")}
                                onSortDesc={() =>
                                  setColumnSort("status", "desc")
                                }
                                onClearSort={() => {
                                  setColumnSort("ticket", "asc")
                                  setStatusFilter("all")
                                  setPage(0)
                                }}
                                filterLabel="Status"
                                filterItems={
                                  <>
                                    {STATUS_OPTIONS.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => {
                                          setStatusFilter(option.value)
                                          setPage(0)
                                        }}
                                        className={cn(
                                          statusFilter === option.value &&
                                            "bg-accent"
                                        )}
                                      >
                                        {option.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                }
                              />
                            </TableHead>
                            <TableHead className="hidden h-12 sm:table-cell">
                              <DirectoryColumnHeader
                                title="Wait"
                                sortDirection={sortDirectionFor("wait")}
                                onSortAsc={() => setColumnSort("wait", "asc")}
                                onSortDesc={() => setColumnSort("wait", "desc")}
                                onClearSort={() =>
                                  setColumnSort("ticket", "asc")
                                }
                              />
                            </TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="hidden h-12 md:table-cell">
                              <DirectoryColumnHeader
                                title="Visit"
                                sortDirection={sortDirectionFor("consultation")}
                                onSortAsc={() =>
                                  setColumnSort("consultation", "asc")
                                }
                                onSortDesc={() =>
                                  setColumnSort("consultation", "desc")
                                }
                                onClearSort={() => {
                                  setColumnSort("ticket", "asc")
                                  setConsultationFilter("all")
                                  setPage(0)
                                }}
                                filterLabel="Visit"
                                filterItems={
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setConsultationFilter("all")
                                        setPage(0)
                                      }}
                                      className={cn(
                                        consultationFilter === "all" &&
                                          "bg-accent"
                                      )}
                                    >
                                      All visits
                                    </DropdownMenuItem>
                                    {consultationOptions.map((option) => (
                                      <DropdownMenuItem
                                        key={option}
                                        onClick={() => {
                                          setConsultationFilter(option)
                                          setPage(0)
                                        }}
                                        className={cn(
                                          consultationFilter === option &&
                                            "bg-accent"
                                        )}
                                      >
                                        {option}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                }
                              />
                            </TableHead>
                            <TableHead className="hidden h-12 lg:table-cell">
                              <DirectoryColumnLabel title="Vitals" />
                            </TableHead>
                            <TableHead className="hidden h-12 sm:table-cell">
                              <DirectoryColumnHeader
                                title="Station"
                                sortDirection={sortDirectionFor("station")}
                                onSortAsc={() => setColumnSort("station", "asc")}
                                onSortDesc={() =>
                                  setColumnSort("station", "desc")
                                }
                                onClearSort={() => {
                                  setColumnSort("ticket", "asc")
                                  setStationFilter("all")
                                  setPage(0)
                                }}
                                filterLabel="Station"
                                filterItems={
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setStationFilter("all")
                                        setPage(0)
                                      }}
                                      className={cn(
                                        stationFilter === "all" && "bg-accent"
                                      )}
                                    >
                                      All stations
                                    </DropdownMenuItem>
                                    {(
                                      [
                                        "nurse",
                                        "physician",
                                        "dentist",
                                      ] as StationId[]
                                    ).map((station) => (
                                      <DropdownMenuItem
                                        key={station}
                                        onClick={() => {
                                          setStationFilter(station)
                                          setPage(0)
                                        }}
                                        className={cn(
                                          stationFilter === station &&
                                            "bg-accent"
                                        )}
                                      >
                                        {stationLabel(station)}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                }
                              />
                            </TableHead>
                            <TableHead className="h-12">
                              <DirectoryColumnHeader
                                title="Status"
                                sortDirection={sortDirectionFor("status")}
                                onSortAsc={() => setColumnSort("status", "asc")}
                                onSortDesc={() =>
                                  setColumnSort("status", "desc")
                                }
                                onClearSort={() => {
                                  setColumnSort("ticket", "asc")
                                  setStatusFilter("all")
                                  setPage(0)
                                }}
                                filterLabel="Status"
                                filterItems={
                                  <>
                                    {STATUS_OPTIONS.map((option) => (
                                      <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => {
                                          setStatusFilter(option.value)
                                          setPage(0)
                                        }}
                                        className={cn(
                                          statusFilter === option.value &&
                                            "bg-accent"
                                        )}
                                      >
                                        {option.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                }
                              />
                            </TableHead>
                            <TableHead className="hidden h-12 sm:table-cell">
                              <DirectoryColumnHeader
                                title="Wait"
                                sortDirection={sortDirectionFor("wait")}
                                onSortAsc={() => setColumnSort("wait", "asc")}
                                onSortDesc={() => setColumnSort("wait", "desc")}
                                onClearSort={() =>
                                  setColumnSort("ticket", "asc")
                                }
                              />
                            </TableHead>
                          </>
                        )}
                        {!readOnly ? (
                          <TableHead className="h-12 pr-6 text-right">
                            <DirectoryColumnLabel
                              title="Actions"
                              className="ml-auto"
                            />
                          </TableHead>
                        ) : (
                          <TableHead className="pr-6" />
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((row) => {
                        const showIntake = isNurse && needsNurseIntake(row)
                        return (
                          <TableRow className="h-12" key={row.ticketId}>
                            <TableCell className="pl-6 font-semibold tabular-nums">
                              {ticketLabel(row.queueNumber, row.ticketCode)}
                            </TableCell>
                            <TableCell className="max-w-[14rem] truncate font-medium">
                              {row.patientName}
                            </TableCell>
                            {isNurse ? (
                              <>
                                <TableCell className="hidden max-w-[9rem] truncate text-muted-foreground md:table-cell tabular-nums">
                                  {row.campusId ?? "—"}
                                </TableCell>
                                <TableCell className="hidden max-w-[11rem] truncate lg:table-cell">
                                  {row.consultationType ?? "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {patientTypeLabel(row.patientType)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <WaitStatusBadge
                                    status={row.status}
                                    waitMinutes={row.estimatedWaitMinutes}
                                  />
                                </TableCell>
                              </>
                            ) : isSpecialtyStation ? (
                              <>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge variant="outline">
                                    {patientTypeLabel(row.patientType)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden max-w-[12rem] truncate md:table-cell">
                                  {row.chiefComplaint ||
                                    row.consultationType ||
                                    "—"}
                                </TableCell>
                                <TableCell>
                                  <WaitStatusBadge
                                    status={row.status}
                                    waitMinutes={row.estimatedWaitMinutes}
                                  />
                                </TableCell>
                                <TableCell className="hidden tabular-nums sm:table-cell">
                                  {row.estimatedWaitMinutes != null
                                    ? `${row.estimatedWaitMinutes}m`
                                    : "—"}
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="hidden max-w-36 truncate md:table-cell">
                                  {row.consultationType}
                                </TableCell>
                                <TableCell className="hidden min-w-40 lg:table-cell">
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
                                  <WaitStatusBadge
                                    status={row.status}
                                    waitMinutes={row.estimatedWaitMinutes}
                                  />
                                </TableCell>
                                <TableCell className="hidden tabular-nums sm:table-cell">
                                  {row.estimatedWaitMinutes != null
                                    ? `${row.estimatedWaitMinutes}m`
                                    : "—"}
                                </TableCell>
                              </>
                            )}
                            {!readOnly ? (
                              <TableCell className="pr-6">
                                <div className="flex items-center justify-end gap-1">
                                  {showIntake ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={pending}
                                      onClick={() => setIntakeTicket(row)}
                                    >
                                      Intake
                                    </Button>
                                  ) : null}
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
                                      {isNurse ? (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              run(() =>
                                                actionVerifyCheckIn(
                                                  row.ticketId
                                                )
                                              )
                                            }
                                          >
                                            Verify check-in
                                          </DropdownMenuItem>
                                          {needsNurseIntake(row) ? (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                setIntakeTicket(row)
                                              }
                                            >
                                              Intake & assign specialty
                                            </DropdownMenuItem>
                                          ) : null}
                                          <DropdownMenuItem
                                            onClick={() => {
                                              const n = window.prompt(
                                                "Assign queue number",
                                                String(
                                                  row.queueNumber ??
                                                    row.queuePosition
                                                )
                                              )
                                              const parsed = Number(n)
                                              if (!n || Number.isNaN(parsed))
                                                return
                                              run(() =>
                                                actionAssignQueueNumber(
                                                  row.ticketId,
                                                  parsed
                                                )
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
                                          run(() =>
                                            actionRecallTicket(row.ticketId)
                                          )
                                        }
                                      >
                                        Call / recall
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          run(() =>
                                            actionStartConsultation(
                                              row.ticketId
                                            )
                                          )
                                        }
                                      >
                                        Start consultation
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          run(() =>
                                            actionCompleteTicket(row.ticketId)
                                          )
                                        }
                                      >
                                        Complete
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          run(() =>
                                            actionSkipTicket(row.ticketId)
                                          )
                                        }
                                      >
                                        Skip
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={row.callCount < 2}
                                        onClick={() =>
                                          run(() =>
                                            actionNoShowTicket(row.ticketId)
                                          )
                                        }
                                      >
                                        Mark no-show
                                        {row.callCount < 2
                                          ? " (need 2 calls)"
                                          : ""}
                                      </DropdownMenuItem>
                                      {row.canRejoin ? (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            run(() =>
                                              actionRejoinQueue(row.ticketId)
                                            )
                                          }
                                        >
                                          Rejoin end of queue
                                        </DropdownMenuItem>
                                      ) : null}
                                      {canTransferQueue(access.designation) ? (
                                        <>
                                          <DropdownMenuSeparator />
                                          {(
                                            [
                                              "physician",
                                              "dentist",
                                              "nurse",
                                            ] as StationId[]
                                          ).map((station) => (
                                            <DropdownMenuItem
                                              key={station}
                                              onClick={() =>
                                                run(() =>
                                                  actionTransferTicket(
                                                    row.ticketId,
                                                    station
                                                  )
                                                )
                                              }
                                            >
                                              Transfer to{" "}
                                              {stationLabel(station)}
                                            </DropdownMenuItem>
                                          ))}
                                        </>
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
                <div className="flex items-center justify-between gap-2 border-t px-6 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} ticket
                    {filtered.length === 1 ? "" : "s"}
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
                      onClick={() =>
                        setPage((p) => Math.min(pageCount - 1, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PanelCell>

          {!isPhysician ? (
          <PanelCell className={isNurse ? "lg:col-span-1" : undefined}>
            <Card className={cn(panelCardClassName)}>
              <CardHeader>
                <CardTitle>Station load</CardTitle>
                <CardDescription>Waiting across clinic lanes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {boards.map((board) => (
                  <div
                    key={board.station}
                    className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {board.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {board.nowServing ?? "Idle"} · ~
                        {board.averageWaitMinutes}m
                      </p>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {board.waitingCount}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PanelCell>
          ) : null}

          {!isNurse && !isPhysician ? (
            <PanelCell>
              <ActivityFeed
                className={panelCardClassName}
                items={activity}
                title="Queue timeline"
              />
            </PanelCell>
          ) : null}

          <PanelCell
            className={
              isNurse
                ? "lg:col-span-2"
                : isPhysician
                  ? "lg:col-span-3"
                  : undefined
            }
          >
            <Card className={cn(panelCardClassName)}>
              <CardHeader>
                <CardTitle>Recently served</CardTitle>
                {!isNurse ? (
                  <CardDescription>Latest completions today.</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2">
                {recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No completions yet.
                  </p>
                ) : (
                  recent
                    .slice(0, isNurse || isPhysician ? 6 : recent.length)
                    .map((item) => (
                    <RecentlyServedCard key={item.ticketId} item={item} />
                  ))
                )}
              </CardContent>
            </Card>
          </PanelCell>
        </PanelGrid>
      </PanelFrame>

      <NurseIntakeSheet
        ticket={intakeTicket}
        open={Boolean(intakeTicket)}
        onOpenChange={(open) => {
          if (!open) setIntakeTicket(null)
        }}
        onAssigned={applyOptimisticAssign}
      />
    </div>
  )
}
