"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useDeferredValue,
} from "react"
import { useConfirm } from "@/components/feedback/confirm-provider"
import {
  consultationToasts,
  patientToasts,
  queueToasts,
} from "@/lib/feedback/toast-messages"
import { useRouter } from "next/navigation"
import {
  getCachedQueue,
  loadQueueBundle,
  saveQueueCache,
} from "@/features/queue/lib/prefetch-queue"
import {
  queueCacheKey,
  staffCacheInvalidate,
  staffCacheIsFresh,
} from "@/lib/ui/staff-data-cache"

import {
  actionCallNext,
  actionNoShowTicket,
  actionRecallTicket,
  actionRejoinQueue,
  actionSkipTicket,
  actionStartConsultation,
  actionTransferTicket,
  actionPlaceScheduledInWaiting,
  actionVerifyCheckIn,
} from "@/lib/health/queue-server-actions"
import { ConsultationSummaryDialog } from "@/components/consultations/consultation-summary-dialog"
import { NurseWelcomeLoader } from "@/components/dashboard/nurse-welcome-loader"
import { QueueTicketDetailDialog } from "@/components/queue/queue-ticket-detail-dialog"
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import { NurseIntakeSheet } from "@/components/queue/nurse-intake-sheet"
import { QueueRescheduleDialog } from "@/components/queue/queue-reschedule-dialog"
import { NurseLaneSwitcher } from "@/components/queue/nurse-lane-switcher"
import { NursePatientsPanel } from "@/components/queue/nurse-patients-panel"
import { NurseWorkbench } from "@/components/queue/nurse-workbench"
import { QueueTicketListItem } from "@/components/queue/queue-ticket-list-item"
import {
  QueueStatusTables,
  type QueueStatusTableSection,
} from "@/components/queue/queue-status-tables"
import { matchesQueueStatusSegment } from "@/components/queue/queue-status-toolbar"
import {
  WaitStatusBadge,
  waitTimerSince,
} from "@/components/queue/wait-status-badge"
import { WalkInSheet } from "@/components/queue/walk-in-sheet"
import { StudentIdSearchInput } from "@/components/shared/student-id-search-input"
import { DENTIST_PATIENT_SEARCH_PLACEHOLDER } from "@/lib/students/patient-search-copy"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { StatCard } from "@/components/shared/stat-card"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PageIntro,
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import type { ColumnSortDirection } from "@/features/admin/components/directory-column-header"
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { StaffAccess } from "@/lib/auth/types"
import { searchPatientByStudentIdAction } from "@/features/patients/actions"
import { ticketLabel, patientTypeLabel } from "@/lib/health/mappers"
import {
  canOpenNurseIntake,
  compareNurseIntakeCompletedOrder,
  compareNurseIntakeOrder,
  isQueueTimeEligible,
  dedupeNursePatientsByPerson,
  dedupeTicketsById,
  isNurseIntakeCompleted,
  isVerifiedNursePatient,
  hasNurseCalledPatient,
  needsCheckInVerify,
  needsNurseIntake,
  pickNowServingTicket,
  preserveNurseIntakeHandoffs,
  queueActionsForTicket,
  ticketsInNurseLane,
  type NurseQueueLane,
  type QueueActionKey,
} from "@/lib/health/nurse-queue"
import { withQueueReadyMarker } from "@/lib/health/queue-ready"
import {
  DEFAULT_QUEUE_EARLY_ENTRY_MINUTES,
  readQueueEarlyEntryMinutes,
  writeQueueEarlyEntryMinutes,
  type QueueEarlyEntryMinutes,
} from "@/lib/health/queue-early-entry-preference"
import {
  canMutateQueue,
  canRegisterWalkIn,
  designationLabel,
  isReadOnlyQueue,
  stationForDesignation,
  stationLabel,
  transferTargetsForDesignation,
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
} from "@/lib/health/types"
import { studentIdMatchesQuery } from "@/lib/students/student-id-input"
import type { PatientRecord } from "@/types/patientRecord"
import { cn } from "@/lib/utils"
import {
  IconAlertTriangle,
  IconBell,
  IconBuildingHospital,
  IconCheck,
  IconClipboardList,
  IconDots,
  IconEye,
  IconHeartbeat,
  IconRefresh,
  IconSearch,
  IconUser,
  IconUserOff,
} from "@tabler/icons-react"

type QueueSortColumn =
  | "ticket"
  | "patient"
  | "type"
  | "status"
  | "consultation"
  | "station"

export function QueuePage({
  access,
  tickets: initialTickets,
  stats: initialStats,
  boards: initialBoards,
  recent: initialRecent,
  activity: initialActivity,
  hydrateFromCache = false,
}: {
  access: StaffAccess
  tickets: QueueTicketRow[]
  stats: QueueStats
  boards: StationBoard[]
  recent: RecentlyServedItem[]
  activity: ActivityItem[]
  hydrateFromCache?: boolean
}) {
  const router = useRouter()
  const { confirmPreset } = useConfirm()
  const [, startTransition] = useTransition()
  /** Only the ticket being mutated is disabled — not the whole queue. */
  const [pendingTicketIds, setPendingTicketIds] = useState(
    () => new Set<string>()
  )
  const [pageActionPending, setPageActionPending] = useState(false)
  const isTicketPending = (ticketId: string) => pendingTicketIds.has(ticketId)
  const cached = hydrateFromCache
    ? getCachedQueue(access.designation)
    : null
  const mergeOpsTickets = (tickets: QueueTicketRow[]) =>
    dedupeTicketsById(
      // Drop legacy session demo tickets if still present in cache.
      tickets.filter((row) => !row.ticketId.startsWith("sample-upcoming-"))
    )

  const [localTickets, setLocalTickets] = useState(() =>
    mergeOpsTickets(cached?.tickets ?? initialTickets)
  )
  /** Local clock tick so Upcoming → Waiting promotion is realtime without a DB write. */
  const [scheduleTick, setScheduleTick] = useState(0)
  const [earlyEntryMinutes, setEarlyEntryMinutes] =
    useState<QueueEarlyEntryMinutes>(DEFAULT_QUEUE_EARLY_ENTRY_MINUTES)
  const [stats, setStats] = useState(() => cached?.stats ?? initialStats)
  // Cache hit paints instantly; cold visit shows skeleton until soft load finishes.
  const [dataLoading, setDataLoading] = useState(
    () => hydrateFromCache && !cached
  )
  const hydratedRef = useRef(false)
  /** Bumped on local mutations so in-flight soft loads cannot wipe optimistic UI. */
  const ticketsEpochRef = useRef(0)

  function applyQueueBundle(
    bundle: {
      tickets: typeof initialTickets
      stats: typeof initialStats
      boards: typeof initialBoards
      recent: typeof initialRecent
      activity: typeof initialActivity
    },
    epoch: number
  ) {
    if (epoch !== ticketsEpochRef.current) return
    setLocalTickets((prev) => {
      const tickets = preserveNurseIntakeHandoffs(
        mergeOpsTickets(bundle.tickets),
        prev
      )
      // Keep boards/recent/activity in session cache for other surfaces; not shown here.
      saveQueueCache(access.designation, { ...bundle, tickets })
      return tickets
    })
    setStats(bundle.stats)
  }

  function softReloadQueue(force = true) {
    const epoch = ticketsEpochRef.current
    void loadQueueBundle(access.designation, { force })
      .then((bundle) => applyQueueBundle(bundle, epoch))
      .catch(() => undefined)
  }

  // Warm session cache from RSC seed so revisits / prefetch share the payload.
  useEffect(() => {
    if (hydrateFromCache) return
    saveQueueCache(access.designation, {
      tickets: initialTickets,
      stats: initialStats,
      boards: initialBoards,
      recent: initialRecent,
      activity: initialActivity,
    })
  }, [
    access.designation,
    hydrateFromCache,
    initialTickets,
    initialStats,
    initialBoards,
    initialRecent,
    initialActivity,
  ])

  useEffect(() => {
    if (!hydrateFromCache || hydratedRef.current) return
    hydratedRef.current = true
    const hit = getCachedQueue(access.designation)
    const fresh =
      Boolean(hit) && staffCacheIsFresh(queueCacheKey(access.designation))
    if (hit) {
      setLocalTickets(mergeOpsTickets(hit.tickets))
      setStats(hit.stats)
      setDataLoading(false)
    }
    if (fresh) return
    // Soft revalidate in the background — keep cache rows visible.
    const epoch = ticketsEpochRef.current
    void loadQueueBundle(access.designation, {
      force: Boolean(hit),
    })
      .then((bundle) => {
        applyQueueBundle(bundle, epoch)
        setDataLoading(false)
      })
      .catch(() => {
        setDataLoading(false)
        if (!hit && initialTickets.length === 0) {
          queueToasts.failed("Could not load the queue.")
        }
      })
  }, [access.designation, hydrateFromCache, initialTickets.length])

  useStaffRealtimeRefresh(
    `staff-queue-${access.designation}`,
    STAFF_REALTIME_TABLES.queue,
    () => {
      // Silent soft refresh — do not flip dataLoading / skeleton.
      softReloadQueue(true)
    },
    500
  )

  useEffect(() => {
    setEarlyEntryMinutes(readQueueEarlyEntryMinutes())
  }, [])

  // Re-evaluate appointment time eligibility while the dashboard stays open
  // (scheduled tickets enter Waiting at the early-entry window without a DB change).
  useEffect(() => {
    const id = window.setInterval(() => {
      setScheduleTick((n) => n + 1)
      const epoch = ticketsEpochRef.current
      void loadQueueBundle(access.designation, { force: true })
        .then((bundle) => {
          if (epoch !== ticketsEpochRef.current) return
          const tickets = mergeOpsTickets(bundle.tickets)
          setLocalTickets(tickets)
          setStats(bundle.stats)
          saveQueueCache(access.designation, { ...bundle, tickets })
        })
        .catch(() => undefined)
    }, 15_000)
    return () => window.clearInterval(id)
  }, [access.designation])
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [stationFilter, setStationFilter] = useState<string>("all")
  const [patientTypeFilter, setPatientTypeFilter] = useState<
    PatientType | "all"
  >("all")
  const [consultationFilter, setConsultationFilter] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<QueueSortColumn>("ticket")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("asc")
  const [nurseLane, setNurseLane] = useState<NurseQueueLane>("needs_intake")
  const [intakeTicket, setIntakeTicket] = useState<QueueTicketRow | null>(null)
  const [viewConsultationId, setViewConsultationId] = useState<string | null>(
    null
  )
  const [viewPatientName, setViewPatientName] = useState<string | null>(null)
  const [viewTicket, setViewTicket] = useState<QueueTicketRow | null>(null)

  function openTicketDetails(row: QueueTicketRow) {
    // After intake: intake summary. Before intake: booking / consultation view.
    if (isNurseIntakeCompleted(row) && row.consultationId) {
      setViewConsultationId(row.consultationId)
      setViewPatientName(row.patientName)
      return
    }
    setViewTicket(row)
  }
  const [rescheduleTicket, setRescheduleTicket] =
    useState<QueueTicketRow | null>(null)
  const [profilePatient, setProfilePatient] = useState<PatientRecord | null>(
    null
  )
  const [loadingPatient, setLoadingPatient] = useState(false)

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
          result.error ||
            "No patient medical record found for this queue entry."
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

  useEffect(() => {
    if (hydrateFromCache) return
    setLocalTickets(mergeOpsTickets(initialTickets))
  }, [hydrateFromCache, initialTickets])

  const readOnly = isReadOnlyQueue(access.designation)
  const canMutate = canMutateQueue(access.designation)
  const myStation = stationForDesignation(access.designation)
  const isNurse = access.designation === "nurse"
  const isPhysician = access.designation === "physician"
  const isDentist = access.designation === "dentist"
  const isSpecialtyStation =
    access.designation === "physician" || access.designation === "dentist"

  /** Search/filter scope without nurse lane — used for Completed after intake handoff. */
  const searchScopedTickets = useMemo(() => {
    const q = deferredQuery.trim()
    const qLower = q.toLowerCase()
    return localTickets.filter((t) => {
      const matchesQuery =
        isNurse || isPhysician
          ? !q ||
            studentIdMatchesQuery(t.campusId, deferredQuery) ||
            studentIdMatchesQuery(t.studentId, deferredQuery)
          : !q ||
            t.patientName.toLowerCase().includes(qLower) ||
            (t.campusId ?? "").toLowerCase().includes(qLower) ||
            t.ticketCode.toLowerCase().includes(qLower) ||
            String(t.queueNumber ?? "").includes(q)
      const matchesStation =
        stationFilter === "all" || t.station === stationFilter
      const matchesType =
        patientTypeFilter === "all" || t.patientType === patientTypeFilter
      const matchesConsultation =
        consultationFilter === "all" ||
        (t.consultationType ?? "") === consultationFilter
      return (
        matchesQuery &&
        matchesStation &&
        matchesType &&
        matchesConsultation
      )
    })
  }, [
    localTickets,
    deferredQuery,
    stationFilter,
    patientTypeFilter,
    consultationFilter,
    isNurse,
    isPhysician,
  ])

  const filtered = useMemo(() => {
    let rows = searchScopedTickets
    if (isNurse) rows = ticketsInNurseLane(rows, nurseLane)

    const direction = sortDirection === "desc" ? -1 : 1
    return [...rows].sort((a, b) => {
      // Nurse intake lane: emergency / front-of-line always rise to the top.
      if (isNurse && nurseLane === "needs_intake") {
        const byPriority = compareNurseIntakeOrder(a, b)
        if (byPriority !== 0) return byPriority
      } else if (isNurse && a.priority !== b.priority) {
        return a.priority === "urgent" ? -1 : 1
      }

      let compare = 0
      if (sortColumn === "ticket") {
        compare = isNurse
          ? a.queuePosition - b.queuePosition ||
            (a.queueNumber ?? 0) - (b.queueNumber ?? 0)
          : (a.queueNumber ?? 0) - (b.queueNumber ?? 0)
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
        compare = a.status.localeCompare(b.status)
      }
      if (compare === 0) {
        compare = a.patientName.localeCompare(b.patientName)
      }
      return compare * direction
    })
  }, [
    searchScopedTickets,
    isNurse,
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

  const statusSections = useMemo((): QueueStatusTableSection[] => {
    // scheduleTick forces early-window promotion into Waiting without a server write.
    void scheduleTick
    const completedRows = isNurse
      ? dedupeNursePatientsByPerson(
          searchScopedTickets
            .filter((row) => isNurseIntakeCompleted(row))
            .sort(compareNurseIntakeCompletedOrder)
        )
      : searchScopedTickets.filter((row) =>
          matchesQueueStatusSegment(row, "completed")
        )
    return [
      {
        id: "waiting",
        title: "Waiting",
        emptyTitle: "No waiting patients",
        rows: dedupeNursePatientsByPerson(
          filtered.filter(
            (row) =>
              // Keep called patients here until check-in (Call next must not hide them).
              (row.status === "waiting" || row.status === "called") &&
              row.priority !== "urgent" &&
              isQueueTimeEligible(row, new Date(), earlyEntryMinutes) &&
              // After check-in → Patients panel only (no double-list).
              !isVerifiedNursePatient(row) &&
              // Intake handoff lives under Completed.
              !isNurseIntakeCompleted(row)
          )
        ),
      },
      {
        id: "emergency",
        title: "Emergencies",
        emptyTitle: "No emergencies",
        rows: dedupeNursePatientsByPerson(
          filtered.filter(
            (row) =>
              matchesQueueStatusSegment(row, "emergency") &&
              (row.status === "waiting" ||
                row.status === "called" ||
                row.status === "ongoing") &&
              // Checked-in emergencies move to Patients — do not list twice.
              !isVerifiedNursePatient(row) &&
              !isNurseIntakeCompleted(row)
          )
        ),
      },
      {
        id: "completed",
        title: "Completed",
        emptyTitle: isNurse
          ? "No completed intakes"
          : "No completed patients",
        rows: completedRows,
      },
    ]
  }, [
    filtered,
    searchScopedTickets,
    scheduleTick,
    earlyEntryMinutes,
    isNurse,
  ])

  function patchTicket(
    ticketId: string,
    patch: Partial<QueueTicketRow>
  ) {
    ticketsEpochRef.current += 1
    setLocalTickets((prev) => {
      const next = prev.map((row) =>
        row.ticketId === ticketId ? { ...row, ...patch } : row
      )
      const cached = getCachedQueue(access.designation)
      if (cached) {
        saveQueueCache(access.designation, { ...cached, tickets: next })
      }
      return next
    })
  }

  function run(
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    options?: {
      successToast?: () => void
      errorToast?: (message?: string) => void
      /** Local-first status/field flip before the server round-trip. */
      optimistic?: { ticketId: string; patch: Partial<QueueTicketRow> }
      /** Scope row busy-state when there is no optimistic patch. */
      ticketId?: string
    }
  ) {
    const busyTicketId =
      options?.ticketId ?? options?.optimistic?.ticketId ?? null
    startTransition(async () => {
      if (busyTicketId) {
        setPendingTicketIds((prev) => new Set(prev).add(busyTicketId))
      } else {
        setPageActionPending(true)
      }
      try {
        const snapshot = localTickets
        if (options?.optimistic) {
          patchTicket(options.optimistic.ticketId, options.optimistic.patch)
        }
      const result = await action()
      if (!result.ok) {
          if (options?.optimistic) {
            ticketsEpochRef.current += 1
            setLocalTickets(snapshot)
            const cached = getCachedQueue(access.designation)
            if (cached) {
              saveQueueCache(access.designation, {
                ...cached,
                tickets: snapshot,
              })
            }
          }
        ;(options?.errorToast ?? queueToasts.failed)(result.error)
        return
      }
      // Call next may pick a different ticket than the client preview — sync SoT.
      if (
        result.ok &&
        result.ticketId &&
        typeof result.callCount === "number"
      ) {
        const serverTicketId = result.ticketId
        const serverCallCount = result.callCount
        if (
          options?.optimistic &&
          options.optimistic.ticketId !== serverTicketId
        ) {
          const prior = snapshot.find(
            (row) => row.ticketId === options.optimistic!.ticketId
          )
          if (prior) {
            patchTicket(prior.ticketId, {
              status: prior.status,
              callCount: prior.callCount,
              estimatedWaitMinutes: prior.estimatedWaitMinutes,
              updatedAt: prior.updatedAt,
            })
          }
        }
        patchTicket(serverTicketId, {
          status: "called",
          callCount: serverCallCount,
          estimatedWaitMinutes: 0,
          updatedAt: new Date().toISOString(),
        })
      }
      if (options?.successToast) {
        options.successToast()
      } else if (result.message) {
          queueToasts.updated(result.message)
        } else {
        queueToasts.updated()
      }
        // Drop stale session cache, then reconcile without clobbering newer patches.
        staffCacheInvalidate(queueCacheKey(access.designation))
        const epoch = ticketsEpochRef.current
        void loadQueueBundle(access.designation, { force: true })
          .then((bundle) => {
            if (epoch !== ticketsEpochRef.current) return
            // Keep optimistic check-in / call if the round-trip still lags.
            if (options?.optimistic) {
              const { ticketId, patch } = options.optimistic
              const mergeTicketId = result.ticketId ?? ticketId
              const merged = bundle.tickets.map((row) => {
                if (row.ticketId !== mergeTicketId && row.ticketId !== ticketId) {
                  return row
                }
                if (row.ticketId === ticketId && ticketId !== mergeTicketId) {
                  // Drop mistaken client preview call on the wrong row.
                  const prior = snapshot.find((s) => s.ticketId === ticketId)
                  return prior ?? row
                }
                if (row.ticketId !== mergeTicketId) return row
                const callAhead =
                  (patch.callCount != null &&
                    row.callCount < patch.callCount) ||
                  (patch.status === "called" && row.status === "waiting") ||
                  (typeof result.callCount === "number" &&
                    row.callCount < result.callCount)
                const checkInAhead = Boolean(
                  patch.checkedInAt && !row.checkedInAt
                )
                if (!callAhead && !checkInAhead) return row
                return {
                  ...row,
                  ...(checkInAhead ? { checkedInAt: patch.checkedInAt } : {}),
                  ...(callAhead
                    ? {
                        status: "called" as const,
                        callCount: Math.max(
                          row.callCount,
                          patch.callCount ?? 0,
                          result.callCount ?? 0
                        ),
                        estimatedWaitMinutes: 0,
                        updatedAt:
                          patch.updatedAt ??
                          row.updatedAt ??
                          new Date().toISOString(),
                      }
                    : {}),
                }
              })
              applyQueueBundle({ ...bundle, tickets: merged }, epoch)
              saveQueueCache(access.designation, {
                ...bundle,
                tickets: merged,
              })
              return
            }
            applyQueueBundle(bundle, epoch)
          })
          .catch(() => undefined)
        // Soft reconcile for peer boards / stats — UI already updated.
      router.refresh()
      } finally {
        if (busyTicketId) {
          setPendingTicketIds((prev) => {
            const next = new Set(prev)
            next.delete(busyTicketId)
            return next
          })
        } else {
          setPageActionPending(false)
        }
      }
    })
  }

  const intakeRollbackRef = useRef<Map<string, Partial<QueueTicketRow>>>(
    new Map()
  )

  function applyOptimisticAssign(
    ticketId: string,
    toStation: SpecialtyStationId
  ) {
    const current = localTickets.find((row) => row.ticketId === ticketId)
    if (current) {
      intakeRollbackRef.current.set(ticketId, {
        station: current.station,
        intakeCompletedAt: current.intakeCompletedAt,
        status: current.status,
      })
    }
    // Local SoT handoff: leave Patients / Waiting, land in Completed immediately.
    // Supabase remains source of truth; soft reload reconciles intake_completed_at.
    patchTicket(ticketId, {
              station: toStation,
              intakeCompletedAt: new Date().toISOString(),
      status: "waiting",
    })
    setScheduleTick((n) => n + 1)
  }

  function revertOptimisticAssign(ticketId: string) {
    const snapshot = intakeRollbackRef.current.get(ticketId)
    intakeRollbackRef.current.delete(ticketId)
    if (!snapshot) return
    patchTicket(ticketId, snapshot)
    setScheduleTick((n) => n + 1)
  }

  function placeScheduledInWaiting(ticket: QueueTicketRow) {
    const patch = {
      intakeNotes: withQueueReadyMarker(ticket.intakeNotes),
              status: "waiting" as const,
      station: "nurse" as const,
    }
    run(() => actionPlaceScheduledInWaiting(ticket.ticketId), {
      successToast: () => queueToasts.placedInWaiting(ticket.patientName),
      optimistic: { ticketId: ticket.ticketId, patch },
    })
    setScheduleTick((n) => n + 1)
  }

  function placeScheduledInWaitingById(ticketId: string) {
    const ticket = localTickets.find((row) => row.ticketId === ticketId)
    if (!ticket) return
    placeScheduledInWaiting(ticket)
  }

  /** Check-in verified — oldest first (one card per person). */
  const notifiedPatients = useMemo(
    () =>
      dedupeNursePatientsByPerson(
        searchScopedTickets.filter((row) => isVerifiedNursePatient(row))
      ),
    [searchScopedTickets]
  )

  const callNextStation =
    access.designation === "admin" ? "nurse" : (myStation ?? "nurse")

  /** First Waiting-list patient Call next can pick (skips emergencies). */
  const nextCallableTicket = useMemo(() => {
    void scheduleTick
    const now = new Date()
    return [...localTickets]
      .filter(
        (ticket) =>
          ticket.status === "waiting" &&
          ticket.priority !== "urgent" &&
          ticket.station === callNextStation &&
          isQueueTimeEligible(ticket, now, earlyEntryMinutes)
      )
      .sort((a, b) => a.queuePosition - b.queuePosition)[0]
  }, [
    localTickets,
    callNextStation,
    earlyEntryMinutes,
    scheduleTick,
  ])

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
              const pool =
                isNurse || myStation
                  ? localTickets.filter((t) =>
                      isNurse ? t.station === "nurse" : t.station === myStation
                    )
                  : localTickets
              const current = pickNowServingTicket(pool)
              return current
                ? ticketLabel(current.queueNumber, current.ticketCode)
                : "—"
            })(),
          },
          { label: "Completed today", value: String(stats.completedToday) },
        ]

  const renderQueueRow = (row: QueueTicketRow, index: number) => {
                        const nurseIntakeDone =
                          isNurse && isNurseIntakeCompleted(row)
                        const actions: Set<QueueActionKey> = nurseIntakeDone
                          ? new Set(["view_details"])
                          : queueActionsForTicket(row)
                        const showIntake =
                          isNurse && needsNurseIntake(row) && !nurseIntakeDone
                        const intakeEnabled = canOpenNurseIntake(row)
                        const showVerify =
                          isNurse && needsCheckInVerify(row) && !nurseIntakeDone
                        const showVerified =
                          isNurse &&
                          Boolean(row.checkedInAt) &&
                          !row.intakeCompletedAt
                        const consultation = displayConsultationLabel(
                          isSpecialtyStation
                            ? row.chiefComplaint || row.consultationType
                            : row.consultationType,
                          row.chiefComplaint
                        )
                        const chips = [
                          ...(row.priority === "urgent"
                            ? [
                                {
                                  key: "emergency",
                                  label: "Emergency",
                                  icon: IconAlertTriangle,
                                },
                              ]
                            : []),
                          ...(isNurse
                            ? [
                                {
                                  key: "consult",
                                  label: consultation,
                                  icon: IconClipboardList,
                                },
                                {
                                  key: "type",
                                  label: patientTypeLabel(row.patientType),
                                  icon: IconUser,
                                },
                              ]
                            : isSpecialtyStation
                              ? [
                                  {
                                    key: "type",
                                    label: patientTypeLabel(row.patientType),
                                    icon: IconUser,
                                  },
                                  {
                                    key: "consult",
                                    label: consultation,
                                    icon: IconClipboardList,
                                  },
                                ]
                              : [
                                  {
                                    key: "consult",
                                    label: consultation,
                                    icon: IconClipboardList,
                                  },
                                  {
                                    key: "station",
                                    label: stationLabel(row.station),
                                    icon: IconBuildingHospital,
                                  },
                                ]),
                        ].filter((c) => c.label && c.label !== "—")
  return (
                          <QueueTicketListItem
                            key={row.ticketId}
                            index={index + 1}
                            ticketCode={ticketLabel(
                              row.queueNumber,
                              row.ticketCode
                            )}
                            patientName={row.patientName}
                            status={
                              nurseIntakeDone || row.priority === "urgent" ? null : (
                                <WaitStatusBadge
                                  status={row.status}
                                  since={waitTimerSince(row)}
                                />
                              )
                            }
                            chips={chips}
                            actions={
                              !readOnly ? (
                                row.priority === "urgent" ? (
                                  showIntake ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-7 gap-1 px-2.5"
                                      disabled={
                                        isTicketPending(row.ticketId) ||
                                        !intakeEnabled
                                      }
                                      aria-label="Start emergency intake"
                                      title="Intake & assign specialty"
                                      onClick={() => {
                                        if (!intakeEnabled) return
                                        queueToasts.intakeOpened(
                                          row.patientName
                                        )
                                        setIntakeTicket(row)
                                      }}
                                    >
                                      <IconHeartbeat
                                        className="size-3.5"
                                        stroke={1.75}
                                        aria-hidden
                                      />
                                      Intake
                                    </Button>
                                  ) : undefined
                                ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <div className="inline-flex items-center gap-1">
                                  {showVerify ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      className="size-7"
                                      disabled={
                                        isTicketPending(row.ticketId) ||
                                        !hasNurseCalledPatient(row)
                                      }
                                      aria-label="Verify check-in"
                                      title={
                                        hasNurseCalledPatient(row)
                                          ? "Verify check-in"
                                          : "Call the patient first"
                                      }
                                      onClick={() => {
                                        if (!hasNurseCalledPatient(row)) return
                                        const now = new Date().toISOString()
                                        const patch = {
                                          checkedInAt: now,
                                          updatedAt: now,
                                          status: "waiting" as const,
                                          station: "nurse" as const,
                                        }
                                        run(
                                          () =>
                                            actionVerifyCheckIn(row.ticketId),
                                          {
                                            successToast: () =>
                                              queueToasts.verified(
                                                row.patientName
                                              ),
                                            optimistic: {
                                              ticketId: row.ticketId,
                                              patch,
                                            },
                                          }
                                        )
                                      }}
                                    >
                                      <IconCheck
                                        className="size-3.5"
                                        stroke={1.75}
                                        aria-hidden
                                      />
                                    </Button>
                                  ) : null}
                                  {showVerified ? (
                                    <span className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background px-2 text-[11px] text-muted-foreground">
                                      <IconCheck
                                        className="size-3"
                                        stroke={1.75}
                                        aria-hidden
                                      />
                                      Checked-in
                                    </span>
                                  ) : null}
                                  {actions.has("call") ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="size-7"
                                      disabled={isTicketPending(row.ticketId)}
                                      aria-label="Call / recall"
                                      title="Call / recall"
                                      onClick={() =>
                                        run(
                                          () =>
                                            actionRecallTicket(row.ticketId),
                                          {
                                            successToast: () =>
                                              row.callCount >= 1
                                                ? queueToasts.recalled(
                                                    row.patientName
                                                  )
                                                : queueToasts.called(
                                                    row.patientName
                                                  ),
                                            optimistic: {
                                              ticketId: row.ticketId,
                                              patch: {
                                                status: "called",
                                                callCount: row.callCount + 1,
                                                estimatedWaitMinutes: 0,
                                                updatedAt:
                                                  new Date().toISOString(),
                                              },
                                            },
                                          }
                                        )
                                      }
                                    >
                                      <IconBell
                                        className="size-3.5"
                                        stroke={1.75}
                                        aria-hidden
                                      />
                                    </Button>
                                  ) : null}
                                  {showIntake ? (
                                      <Button
                                        type="button"
                                        size="icon-sm"
                                        variant="outline"
                                        className="size-7"
                                        disabled={
                                          isTicketPending(row.ticketId) ||
                                          !intakeEnabled
                                        }
                                        aria-label="Intake"
                                        title={
                                          intakeEnabled
                                            ? "Intake & assign specialty"
                                            : "Verify check-in first"
                                        }
                                        onClick={() => {
                                          if (!intakeEnabled) return
                                          queueToasts.intakeOpened(
                                            row.patientName
                                          )
                                          setIntakeTicket(row)
                                        }}
                                      >
                                        <IconHeartbeat
                                          className="size-3.5"
                                          stroke={1.75}
                                          aria-hidden
                                        />
                                      </Button>
                                  ) : null}
                                  </div>
                                  {actions.has("no_show") ||
                                  actions.has("view_details") ||
                                  actions.has("intake") ||
                                  actions.has("start") ||
                                  actions.has("skip") ||
                                  actions.has("rejoin") ||
                                  actions.has("reschedule") ? (
                                    <>
                                      <span
                                        className="mx-0.5 hidden h-4 w-px bg-border sm:block"
                                        aria-hidden
                                      />
                                      <div className="inline-flex items-center gap-1">
                                  {actions.has("no_show") ? (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="size-7"
                                      disabled={
                                        isTicketPending(row.ticketId) ||
                                        row.callCount < 2
                                      }
                                      aria-label="Mark as no-show"
                                      title={
                                        row.callCount < 2
                                          ? "Call twice before marking no-show"
                                          : "Mark as no-show"
                                      }
                                      onClick={() => {
                                        if (row.callCount < 2) return
                                        void confirmPreset("removeFromQueue", {
                                          onConfirm: async () => {
                                            run(
                                              () =>
                                                actionNoShowTicket(
                                                  row.ticketId
                                                ),
                                              {
                                                successToast: () =>
                                                  queueToasts.removed(
                                                    row.patientName
                                                  ),
                                                optimistic: {
                                                  ticketId: row.ticketId,
                                                  patch: {
                                                    status: "no_show",
                                                    estimatedWaitMinutes: 0,
                                                  },
                                                },
                                              }
                                            )
                                          },
                                        })
                                      }}
                                    >
                                      <IconUserOff
                                        className={cn(
                                          "size-3.5",
                                          row.callCount >= 2 &&
                                            !isTicketPending(row.ticketId) &&
                                            "text-destructive"
                                        )}
                                        stroke={1.75}
                                        aria-hidden
                                      />
                                    </Button>
                                  ) : null}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      render={
                                        <Button
                                          size="icon-sm"
                                          variant="outline"
                                          className="size-7"
                                          aria-label="Queue actions"
                                          disabled={isTicketPending(
                                            row.ticketId
                                          )}
                                        />
                                      }
                                    >
                                      <IconDots className="size-3.5" stroke={1.75} />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {actions.has("view_details") ? (
                                        <DropdownMenuItem
                                          onClick={() => openTicketDetails(row)}
                                        >
                                          View details
                                        </DropdownMenuItem>
                                      ) : null}
                                      {isNurse && actions.has("intake") ? (
                                        <>
                                            <DropdownMenuItem
                                            onClick={() => {
                                              queueToasts.intakeOpened(
                                                row.patientName
                                              )
                                                setIntakeTicket(row)
                                            }}
                                            >
                                              Intake & assign specialty
                                            </DropdownMenuItem>
                                          {actions.has("start") ? (
                                            <DropdownMenuSeparator />
                                          ) : null}
                                        </>
                                      ) : null}
                                      {actions.has("start") ? (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          void confirmPreset("startConsultation", {
                                            onConfirm: async () => {
                                              if (isPhysician || isDentist) {
                                                if (isDentist) {
                                                  setLocalTickets((prev) =>
                                                    prev.map((ticket) =>
                                                      ticket.ticketId === row.ticketId
                                                        ? {
                                                            ...ticket,
                                                            status: "ongoing" as const,
                                                            estimatedWaitMinutes: 0,
                                                            assignedPersonnel:
                                                              access.fullName,
                                                          }
                                                        : ticket
                                                    )
                                                  )
                                                }
                                                startTransition(async () => {
                                                  const result =
                                                    await actionStartConsultation(
                                                      row.ticketId
                                                    )
                                                  if (!result.ok) {
                                                    queueToasts.failed(result.error)
                                                    router.refresh()
                                                    return
                                                  }
                                                  consultationToasts.started(
                                                    row.patientName
                                                  )
                                                  // Dentist chart is keyed by appointments.id;
                                                  // physician clinical visit is keyed by consultations.id.
                                                  const visitId = isDentist
                                                    ? (result.appointmentId ??
                                                        row.appointmentId ??
                                                        result.consultationId ??
                                                        row.consultationId)
                                                    : (result.consultationId ??
                                                        result.appointmentId ??
                                                        row.consultationId ??
                                                        row.appointmentId)
                                                  if (!visitId) {
                                                    queueToasts.failed(
                                                      "Consultation started, but no visit record was linked."
                                                    )
                                                    router.refresh()
                                                    return
                                                  }
                                                  const rolePath = isDentist
                                                    ? "dentist"
                                                    : "physician"
                                                  router.push(
                                                    `/${rolePath}/consultation/${visitId}`
                                                  )
                                                })
                                                return
                                              }
                                              run(
                                                () =>
                                                actionStartConsultation(
                                                  row.ticketId
                                                ),
                                                {
                                                  successToast: () =>
                                                    consultationToasts.started(
                                                      row.patientName
                                                    ),
                                                  optimistic: {
                                                    ticketId: row.ticketId,
                                                    patch: {
                                                      status: "ongoing",
                                                      estimatedWaitMinutes: 0,
                                                      assignedPersonnel:
                                                        access.fullName,
                                                    },
                                                  },
                                                }
                                              )
                                            },
                                          })
                                        }}
                                      >
                                        Start consultation
                                      </DropdownMenuItem>
                                      ) : null}
                                      {actions.has("skip") ||
                                      actions.has("no_show") ||
                                      actions.has("rejoin") ||
                                      actions.has("reschedule") ? (
                                      <DropdownMenuSeparator />
                                      ) : null}
                                      {actions.has("skip") ? (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          void confirmPreset("skipPatient", {
                                            onConfirm: async () => {
                                              run(
                                                () =>
                                                  actionSkipTicket(row.ticketId),
                                                {
                                                  successToast: () =>
                                                    queueToasts.skipped(
                                                      row.patientName
                                                    ),
                                                  optimistic: {
                                                    ticketId: row.ticketId,
                                                    patch: {
                                                      status: "no_show",
                                                      estimatedWaitMinutes: 0,
                                                      canRejoin:
                                                        row.rejoinCount < 1,
                                                    },
                                                  },
                                                }
                                              )
                                            },
                                          })
                                        }}
                                      >
                                        Skip
                                      </DropdownMenuItem>
                                      ) : null}
                                      {actions.has("no_show") ? (
                                      <DropdownMenuItem
                                        disabled={row.callCount < 2}
                                        onClick={() => {
                                          void confirmPreset("removeFromQueue", {
                                            onConfirm: async () => {
                                              run(
                                                () =>
                                                  actionNoShowTicket(
                                                    row.ticketId
                                                  ),
                                                {
                                                  successToast: () =>
                                                    queueToasts.removed(
                                                      row.patientName
                                                    ),
                                                  optimistic: {
                                                    ticketId: row.ticketId,
                                                    patch: {
                                                      status: "no_show",
                                                      estimatedWaitMinutes: 0,
                                                    },
                                                  },
                                                }
                                              )
                                            },
                                          })
                                        }}
                                      >
                                        Mark no-show
                                        {row.callCount < 2
                                          ? " (need 2 calls)"
                                          : ""}
                                      </DropdownMenuItem>
                                      ) : null}
                                      {actions.has("rejoin") ? (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            run(
                                              () =>
                                                actionRejoinQueue(row.ticketId),
                                              {
                                                successToast: () =>
                                                  queueToasts.rejoined(
                                                    row.patientName
                                                  ),
                                                optimistic: {
                                                  ticketId: row.ticketId,
                                                  patch: {
                                                    status: "waiting",
                                                    rejoinCount:
                                                      row.rejoinCount + 1,
                                                  },
                                                },
                                              }
                                            )
                                          }
                                        >
                                          Rejoin end of queue
                                        </DropdownMenuItem>
                                      ) : null}
                                      {actions.has("reschedule") ? (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setRescheduleTicket(row)
                                          }
                                        >
                                          Reschedule
                                        </DropdownMenuItem>
                                      ) : null}
                                      {transferTargetsForDesignation(
                                        access.designation
                                      ).length > 0 &&
                                      row.status !== "completed" &&
                                      row.status !== "no_show" &&
                                      row.status !== "expired" ? (
                                        <>
                                          <DropdownMenuSeparator />
                                          {transferTargetsForDesignation(
                                            access.designation
                                          ).map((target) => (
                                            <DropdownMenuItem
                                              key={target}
                                              onClick={() =>
                                                run(
                                                  () =>
                                                  actionTransferTicket(
                                                    row.ticketId,
                                                    target
                                                    ),
                                                  {
                                                    successToast: () =>
                                                      queueToasts.transferred(
                                                        row.patientName,
                                                        stationLabel(target)
                                                      ),
                                                    optimistic: {
                                                      ticketId: row.ticketId,
                                                      patch: {
                                                        station: target,
                                                        status: "waiting",
                                                      },
                                                    },
                                                  }
                                                )
                                              }
                                            >
                                              Transfer to{" "}
                                              {stationLabel(target)}
                                            </DropdownMenuItem>
                                          ))}
                                        </>
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                                )
                              ) : undefined
                            }
                          />
                        )

                    }


  return (
    <div
      className={
        isPhysician
          ? "flex flex-1 flex-col gap-10 pt-2"
          : "flex flex-1 flex-col gap-8 pt-2"
      }
    >
      {isNurse ? (
        <NurseWelcomeLoader
          open={dataLoading}
          nurseName={access.fullName}
        />
          ) : null}
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
          isNurse
            ? "Verify check-in, take vitals, and assign patients to a physician or dentist."
            : isPhysician
              ? "Call and manage patients waiting at your physician station."
              : isDentist
                ? "Call and manage patients waiting at your dental station."
                : `${designationLabel(access.designation)}${
                    readOnly
                      ? " · monitoring only"
                      : " · live controls"
                  }`
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
                }}
              />
            </PanelCell>
          ) : isPhysician || isDentist ? null : (
            cards.map((card) => (
              <PanelCell key={card.label}>
                <StatCard
                  flush
                  label={card.label}
                  value={card.value}
                  loading={dataLoading}
                />
              </PanelCell>
            ))
          )}

          <PanelCell
            className={
              isNurse && nurseLane === "needs_intake"
                ? "lg:col-span-2"
                : "lg:col-span-3"
            }
          >
            <Card className={cn(panelCardClassName, "h-full gap-0 py-0")}>
              <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
                <div className="flex flex-col gap-3">
                  <CardTitle className="text-base">
                    {isNurse
                      ? nurseLane === "needs_intake"
                        ? "Needs intake"
                        : nurseLane === "at_specialty"
                          ? "Specialty queue"
                          : "Exceptions"
                      : "Live queue"}
                  </CardTitle>
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                    {isNurse || isPhysician ? (
                      <StudentIdSearchInput
                        className="w-full sm:min-w-[10rem] sm:flex-1"
                        inputClassName="h-9"
                        value={query}
                        onChange={(next) => {
                          setQuery(next)
                        }}
                        placeholder="Search by ID Number"
                        aria-label="Search by ID Number"
                      />
                    ) : (
                      <InputGroup className="h-9 w-full sm:min-w-[10rem] sm:flex-1">
                        <InputGroupAddon align="inline-start">
                          <IconSearch
                            className="size-4 opacity-60"
                            aria-hidden
                          />
                        </InputGroupAddon>
                        <InputGroupInput
                          placeholder={
                            isDentist
                              ? DENTIST_PATIENT_SEARCH_PLACEHOLDER
                              : "Search ticket or patient"
                          }
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value)
                          }}
                          aria-label={
                            isDentist
                              ? DENTIST_PATIENT_SEARCH_PLACEHOLDER
                              : "Search ticket or patient"
                          }
                        />
                      </InputGroup>
                    )}
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                      {canRegisterWalkIn(access.designation) ? (
                        <WalkInSheet
                          triggerClassName="h-9"
                          onRegistered={() => {
                            staffCacheInvalidate(
                              queueCacheKey(access.designation)
                            )
                            softReloadQueue(true)
                          }}
                        />
                ) : null}
                      {canMutate ? (
                        <Button
                          size="sm"
                          className="h-9"
                          disabled={
                            pageActionPending || !nextCallableTicket
                          }
                          title={
                            nextCallableTicket
                              ? `Call ${nextCallableTicket.patientName}`
                              : "No waiting patients to call"
                          }
                          onClick={() => {
                            const nextUp = nextCallableTicket
                            if (!nextUp) return
                            run(
                              () =>
                                actionCallNext(
                                  access.designation === "admin"
                                    ? undefined
                                    : (myStation ?? "nurse")
                                ),
                              {
                                successToast: () =>
                                  queueToasts.called(nextUp.patientName),
                                ticketId: nextUp.ticketId,
                                optimistic: {
                                  ticketId: nextUp.ticketId,
                                  patch: {
                                    status: "called",
                                    callCount: nextUp.callCount + 1,
                                    estimatedWaitMinutes: 0,
                                    updatedAt: new Date().toISOString(),
                                  },
                                },
                              }
                            )
                          }}
                        >
                          <IconBell
                            data-icon="inline-start"
                            className="size-4"
                            aria-hidden
                          />
                          Call next
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="size-9"
                        aria-label="Refresh queue"
                        disabled={pageActionPending || dataLoading}
                        onClick={() => {
                          if (hydrateFromCache) {
                            staffCacheInvalidate(
                              queueCacheKey(access.designation)
                            )
                            ticketsEpochRef.current += 1
                            const epoch = ticketsEpochRef.current
                            const showSkeleton = localTickets.length === 0
                            if (showSkeleton) setDataLoading(true)
                            void loadQueueBundle(access.designation, {
                              force: true,
                            })
                              .then((bundle) => {
                                applyQueueBundle(bundle, epoch)
                                queueToasts.refreshed()
                              })
                              .catch(() =>
                                queueToasts.failed(
                                  "Could not refresh the queue."
                                )
                              )
                              .finally(() => setDataLoading(false))
                            return
                          }
                          queueToasts.refreshed()
                          router.refresh()
                        }}
                      >
                        <IconRefresh className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="min-w-0 px-0 pb-0">
                {dataLoading ? (
                  <div className="space-y-3 px-6 py-6" role="status" aria-label="Loading queue">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-3/4 rounded-lg" />
                  </div>
                ) : (
                  <QueueStatusTables
                    sections={statusSections}
                    renderRow={renderQueueRow}
                    onAcceptScheduledDrop={
                      isNurse ? placeScheduledInWaitingById : undefined
                    }
                  />
                )}
              </CardContent>
            </Card>
          </PanelCell>

          {isNurse && nurseLane === "needs_intake" ? (
            <PanelCell className="lg:col-span-1">
              <div className="flex flex-col gap-3">
                <NursePatientsPanel
                  rows={notifiedPatients}
                  isTicketPending={isTicketPending}
                  onCall={(row) =>
                    run(() => actionRecallTicket(row.ticketId), {
                      successToast: () =>
                        row.callCount >= 1
                          ? queueToasts.recalled(row.patientName)
                          : queueToasts.called(row.patientName),
                      optimistic: {
                        ticketId: row.ticketId,
                        patch: {
                          status: "called",
                          callCount: row.callCount + 1,
                          estimatedWaitMinutes: 0,
                          updatedAt: new Date().toISOString(),
                        },
                      },
                    })
                  }
                  onIntake={(row) => {
                    queueToasts.intakeOpened(row.patientName)
                    setIntakeTicket(row)
                  }}
                  onViewDetails={openTicketDetails}
                />
                <NurseWorkbench
                  tickets={localTickets}
                  isTicketPending={isTicketPending}
                  earlyEntryMinutes={earlyEntryMinutes}
                  onEarlyEntryMinutesChange={(minutes) => {
                    writeQueueEarlyEntryMinutes(minutes)
                    setEarlyEntryMinutes(minutes)
                  }}
                  onPlaceInWaiting={placeScheduledInWaiting}
                  variant="panel"
                />
              </div>
            </PanelCell>
          ) : null}
        </PanelGrid>
      </PanelFrame>

      <NurseIntakeSheet
        ticket={intakeTicket}
        open={Boolean(intakeTicket)}
        onOpenChange={(open) => {
          if (!open) setIntakeTicket(null)
        }}
        onAssigned={applyOptimisticAssign}
        onAssignFailed={revertOptimisticAssign}
        onAssignSynced={() => {
          if (intakeTicket) {
            intakeRollbackRef.current.delete(intakeTicket.ticketId)
          }
          staffCacheInvalidate(queueCacheKey(access.designation))
          softReloadQueue(true)
        }}
      />
      <QueueTicketDetailDialog
        ticket={viewTicket}
        open={Boolean(viewTicket)}
        onOpenChange={(open) => {
          if (!open) setViewTicket(null)
        }}
      />
      <ConsultationSummaryDialog
        consultationId={viewConsultationId}
        open={Boolean(viewConsultationId)}
        onOpenChange={(open) => {
          if (!open) {
            setViewConsultationId(null)
            setViewPatientName(null)
          }
        }}
        patientName={viewPatientName}
        doneLabel="Closed"
        showCloseButton={false}
      />
      <QueueRescheduleDialog
        ticket={rescheduleTicket}
        open={Boolean(rescheduleTicket)}
        onOpenChange={(open) => {
          if (!open) setRescheduleTicket(null)
        }}
        onRescheduled={() => router.refresh()}
      />
      <PatientProfileSheet
        patient={profilePatient}
        open={Boolean(profilePatient)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setProfilePatient(null)
        }}
      />
    </div>
  )
}
