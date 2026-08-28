"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import Link from "next/link"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { appToast } from "@/lib/feedback/app-toast"
import {
  CONSULTATION_DATE_RANGE_LABELS,
  type ConsultationDateRange,
} from "@/lib/date/consultation-date-range"
import { PATIENT_SEARCH_PLACEHOLDER } from "@/lib/students/patient-search-copy"

import { ConsultationDeleteDialog } from "@/components/consultations/consultation-delete-dialog"
import { ConsultationFormSheet } from "@/components/consultations/consultation-form-sheet"
import {
  ConsultationListCard,
  formatConsultationTableDate,
  providerLabel,
  serviceLabel,
} from "@/components/consultations/consultation-list-card"
import { ConsultationStatusBadge } from "@/components/consultations/consultation-status-badge"
import { PatientVisitDetailDialog } from "@/components/patients/patient-visit-detail-dialog"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import {
  PanelFrame,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  fetchConsultationStatsAction,
  listConsultationFilterOptionsAction,
  searchConsultationsAction,
  updateConsultationAction,
} from "@/features/consultations/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  CONSULTATION_STATUSES,
  CONSULTATION_TAB_STATUSES,
  consultationStatusLabel,
  type Consultation,
  type ConsultationListResult,
  type ConsultationStats,
  type ConsultationStatus,
} from "@/types/consultation"
import { IconStethoscope } from "@tabler/icons-react"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

function toStatCards(
  stats: ConsultationStats,
  mode: "nurse" | "clinician" | "default" = "default"
): DemoStat[] {
  if (mode === "nurse") {
    return [
      {
        key: "open",
        label: "Open today",
        value: String(stats.openToday),
        description: "Consultations created today",
      },
      {
        key: "assessment",
        label: "In nurse queue",
        value: String(stats.awaitingAssessment),
        description: "Waiting for vitals",
      },
      {
        key: "in_progress",
        label: "Vitals in progress",
        value: String(stats.inProgress),
        description: "Until doctor starts",
      },
      {
        key: "done",
        label: "Completed today",
        value: String(stats.completedToday),
        description: "Doctor finished",
      },
    ]
  }
  if (mode === "clinician") {
    return [
      {
        key: "open",
        label: "Queued today",
        value: String(stats.openToday),
        description: "Post-vitals patients",
      },
      {
        key: "assessment",
        label: "Waiting to be called",
        value: String(stats.awaitingAssessment),
        description: "Ready for consultation",
      },
      {
        key: "in_progress",
        label: "In consultation",
        value: String(stats.inProgress),
        description: "Ongoing with you",
      },
      {
        key: "done",
        label: "Completed today",
        value: String(stats.completedToday),
        description: "Sessions finished",
      },
    ]
  }
  return [
    {
      key: "open",
      label: "Open today",
      value: String(stats.openToday),
      description: "Across stations",
    },
    {
      key: "assessment",
      label: "Awaiting assessment",
      value: String(stats.awaitingAssessment),
      description: "Nurse triage",
    },
    {
      key: "in_progress",
      label: "In progress",
      value: String(stats.inProgress),
      description: "With provider",
    },
    {
      key: "done",
      label: "Completed today",
      value: String(stats.completedToday),
      description: "Charted & closed",
    },
  ]
}

function ConsultationsTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-40" />
        </div>
      ))}
    </div>
  )
}

export function ConsultationsPage({
  access,
  initialList,
  initialStats,
  initialError,
  initialProviders = [],
  initialStations = [],
}: {
  access: StaffAccess
  initialList: ConsultationListResult
  initialStats: ConsultationStats
  initialError?: string | null
  initialProviders?: string[]
  initialStations?: string[]
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | "all">(
    "all"
  )
  const [providerFilter, setProviderFilter] = useState("all")
  const [providerTypeFilter, setProviderTypeFilter] = useState<
    "all" | "physician" | "dentist"
  >("all")
  const [stationFilter, setStationFilter] = useState(
    access.designation === "dentist"
      ? "dentist"
      : access.designation === "physician"
        ? "physician"
        : "all"
  )
  const [dateRange, setDateRange] = useState<ConsultationDateRange>("all_time")
  const [providers, setProviders] = useState(initialProviders)
  const [stations, setStations] = useState(initialStations)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<Consultation | null>(null)
  const [deleting, setDeleting] = useState<Consultation | null>(null)
  const [viewing, setViewing] = useState<Consultation | null>(null)
  const [isPending, startTransition] = useTransition()
  const { confirmPreset } = useConfirm()
  const skipNextFetch = useRef(true)
  const d = access.designation
  const isPhysician = d === "physician"
  const isNurse = d === "nurse"
  const isDentist = d === "dentist"

  useEffect(() => {
    if (initialError) {
      appToast.error({
        title: "Unable to Load Consultations",
        description: initialError,
      })
    }
  }, [initialError])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim()
      if (nextQuery === debouncedQuery) return
      setDebouncedQuery(nextQuery)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, debouncedQuery])

  const filterParams = useMemo(
    () => ({
      page: 1,
      pageSize: PAGE_SIZE,
      status: statusFilter,
      provider: isPhysician || isNurse || isDentist ? "all" : providerFilter,
      station: isPhysician
        ? "physician"
        : isDentist
          ? "dentist"
          : isNurse
            ? "all"
            : stationFilter,
      providerType: isNurse ? providerTypeFilter : "all",
      consultationDate: "all",
      dateRange,
    }),
    [
      statusFilter,
      providerFilter,
      stationFilter,
      dateRange,
      isPhysician,
      isNurse,
      isDentist,
      providerTypeFilter,
    ]
  )

  const loadPage = useCallback(
    async (nextQuery: string) => {
      setLoading(true)
      try {
        const [listResult, statsResult, optionsResult] = await Promise.all([
          searchConsultationsAction(nextQuery, filterParams),
          fetchConsultationStatsAction(),
          listConsultationFilterOptionsAction(),
        ])
        if (!listResult.ok) {
          appToast.error({
            title: "Unable to Load Consultations",
            description: listResult.error,
          })
          return
        }
        if (!statsResult.ok) {
          appToast.error({
            title: "Unable to Load Consultation Summary",
            description: statsResult.error,
          })
          return
        }
        setList(listResult.data)
        setStats(statsResult.data)
        if (optionsResult.ok) {
          setProviders(optionsResult.data.providers)
          setStations(optionsResult.data.stations)
        }
      } catch {
        appToast.error({
          title: "Unable to Load Consultations",
          description:
            "Unable to reach the database. Check your connection and try again.",
        })
      } finally {
        setLoading(false)
      }
    },
    [filterParams]
  )

  const refresh = useCallback(() => {
    startTransition(() => {
      void loadPage(debouncedQuery)
    })
  }, [debouncedQuery, loadPage])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery)
  }, [debouncedQuery, loadPage])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("consultations_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        () => {
          void loadPage(debouncedQuery)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_records" },
        () => {
          void loadPage(debouncedQuery)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [debouncedQuery, loadPage])

  const isClinician = isPhysician || isDentist
  const rolePath = isDentist ? "dentist" : "physician"

  const statCards = useMemo(
    () =>
      toStatCards(
        stats,
        isNurse ? "nurse" : isClinician ? "clinician" : "default"
      ),
    [stats, isNurse, isClinician]
  )
  const showSkeleton = loading || isPending
  const rows = list.items

  async function applyConsultationPatch(
    row: Consultation,
    patch: Partial<{
      assessment: string
      diagnosis: string
      treatment: string
      prescription: string
      status: ConsultationStatus
    }>
  ) {
    const result = await updateConsultationAction({
      id: row.id,
      patientId: row.patientId,
      chiefComplaint: row.chiefComplaint,
      symptoms: row.symptoms,
      assessment: patch.assessment ?? row.assessment,
      diagnosis: patch.diagnosis ?? row.diagnosis,
      treatment: patch.treatment ?? row.treatment,
      prescription: patch.prescription ?? row.prescription,
      providerName: row.providerName,
      providerRole: row.providerRole,
      station: row.station,
      status: patch.status ?? row.status,
      priority: row.priority,
      consultationDate: row.consultationDate,
      followUpDate: row.followUpDate,
      notes: row.notes,
    })
    if (!result.ok) {
      throw new Error(result.error)
    }
    refresh()
  }

  async function completeConsultation(row: Consultation) {
    await confirmPreset("completeConsultation", {
      onConfirm: async () => {
        await applyConsultationPatch(row, { status: "completed" })
      },
      successToast: {
        title: "Consultation Completed",
        description:
          "The consultation has been marked as completed successfully.",
      },
      errorToast: {
        title: "Unable to Complete Consultation",
      },
    })
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-8 pt-2",
        isDentist && "gap-10 pt-3"
      )}
    >
      <DemoPageHeader
        title={d === "dentist" ? "Dental consultations" : "Consultations"}
        description={
          isNurse || isPhysician || isDentist
            ? ""
            : "Triage assessments and clinical charting"
        }
        designation={d}
        showDemoBanner={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={refresh}>
              Refresh
            </Button>
            {!(isPhysician || isDentist) &&
            (can(d, "consultations.create_record") ||
              can(d, "consultations.record_initial_assessment")) ? (
              <Button
                size="sm"
                onClick={() => {
                  setFormMode("create")
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                Create consultation
              </Button>
            ) : null}
          </div>
        }
      />

      {can(d, "consultations.cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <PanelFrame>
      <Card className={cn(panelCardClassName, "gap-0 py-0")}>
        <CardHeader className="gap-4 border-b px-6 py-5">
          <CardTitle className="text-base">Consultations</CardTitle>
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              isDentist && "gap-3"
            )}
          >
            <Input
              className="w-full min-w-[12rem] sm:w-56"
              placeholder={PATIENT_SEARCH_PLACEHOLDER}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={PATIENT_SEARCH_PLACEHOLDER}
            />
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter((value as ConsultationStatus | "all") ?? "all")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {CONSULTATION_TAB_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {consultationStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isNurse ? (
              <Select
                value={providerTypeFilter}
                onValueChange={(value) =>
                  setProviderTypeFilter(
                    (value as "all" | "physician" | "dentist") ?? "all"
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  <SelectItem value="physician">Physician</SelectItem>
                  <SelectItem value="dentist">Dentist</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            {!isPhysician && !isNurse && !isDentist ? (
              <>
                <Select
                  value={providerFilter}
                  onValueChange={(value) => setProviderFilter(value ?? "all")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All providers</SelectItem>
                    {providers.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={stationFilter}
                  onValueChange={(value) => setStationFilter(value ?? "all")}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Station" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stations</SelectItem>
                    {stations.map((station) => (
                      <SelectItem key={station} value={station}>
                        {station}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
            <Select
              value={dateRange}
              onValueChange={(value) =>
                setDateRange((value as ConsultationDateRange) ?? "all_time")
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(
                    CONSULTATION_DATE_RANGE_LABELS
                  ) as ConsultationDateRange[]
                ).map((range) => (
                  <SelectItem key={range} value={range}>
                    {CONSULTATION_DATE_RANGE_LABELS[range]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 p-0">
          {showSkeleton ? (
            <ConsultationsTableSkeleton />
          ) : rows.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconStethoscope aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No consultations found</EmptyTitle>
                <EmptyDescription>
                  Consultations will appear here once approved consultation
                  requests enter the consultation workflow.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
            <div className="flex flex-col gap-3 p-4 md:hidden">
              {rows.map((row) => (
                <ConsultationListCard
                  key={row.id}
                  row={row}
                  clinicianHref={
                    isClinician ? `/${rolePath}/consultation/${row.id}` : undefined
                  }
                  onView={() => setViewing(row)}
                  showComplete={
                    isClinician && row.status !== "completed"
                  }
                  onComplete={() => void completeConsultation(row)}
                />
              ))}
            </div>
            <div className="hidden min-w-0 overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className={isDentist ? "h-14" : undefined}>
                  <TableHead className={isDentist ? "px-4" : undefined}>
                    Patient
                  </TableHead>
                  <TableHead
                    className={cn(
                      "hidden lg:table-cell",
                      isDentist && "px-4"
                    )}
                  >
                    Patient ID
                  </TableHead>
                  <TableHead
                    className={cn(
                      "hidden sm:table-cell",
                      isDentist && "px-4"
                    )}
                  >
                    Service
                  </TableHead>
                  <TableHead
                    className={cn(
                      "hidden sm:table-cell",
                      isDentist && "px-4"
                    )}
                  >
                    Provider
                  </TableHead>
                  <TableHead
                    className={cn(
                      "hidden md:table-cell",
                      isDentist && "px-4"
                    )}
                  >
                    Date
                  </TableHead>
                  <TableHead
                    className={cn(
                      "hidden lg:table-cell",
                      isDentist && "px-4"
                    )}
                  >
                    Queue #
                  </TableHead>
                  <TableHead className={isDentist ? "px-4" : undefined}>
                    Status
                  </TableHead>
                  <TableHead
                    className={cn(
                      "text-right",
                      isDentist && "px-4"
                    )}
                  >
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={isDentist ? "h-14" : undefined}
                    >
                      <TableCell className={isDentist ? "px-4" : undefined}>
                        <p className="font-medium">{row.patient.fullName}</p>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden lg:table-cell",
                          isDentist && "px-4"
                        )}
                      >
                        {row.patient.studentId || "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden sm:table-cell",
                          isDentist && "px-4"
                        )}
                      >
                        {serviceLabel(row)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden sm:table-cell capitalize",
                          isDentist && "px-4"
                        )}
                      >
                        {providerLabel(row)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden md:table-cell",
                          isDentist && "px-4"
                        )}
                      >
                        {formatConsultationTableDate(row.consultationDate)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "hidden lg:table-cell",
                          isDentist && "px-4"
                        )}
                      >
                        {row.queueNumber ?? "—"}
                      </TableCell>
                      <TableCell className={isDentist ? "px-4" : undefined}>
                        <ConsultationStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className={isDentist ? "px-4" : undefined}>
                        <div className="flex flex-wrap justify-end gap-1">
                          {isClinician ? (
                            <>
                              <Button
                                type="button"
                                size="xs"
                                render={
                                  <Link
                                    href={`/${rolePath}/consultation/${row.id}`}
                                  />
                                }
                                nativeButton={false}
                              >
                                Open
                              </Button>
                              {row.status !== "completed" ? (
                                <Button
                                  size="xs"
                                  variant="secondary"
                                  onClick={() => void completeConsultation(row)}
                                >
                                  Complete
                                </Button>
                              ) : null}
                            </>
                          ) : (
                            <>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => setViewing(row)}
                          >
                            View
                          </Button>
                          {can(d, "consultations.view_patient") ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                appToast.info({
                                  title: "Patient",
                                  description: `${row.patient.fullName} · ${row.patient.studentId}`,
                                })
                              }
                            >
                              Patient
                            </Button>
                          ) : null}
                          {can(d, "consultations.record_initial_assessment") &&
                          !row.assessment ? (
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => {
                                setFormMode("edit")
                                setEditing(row)
                                setFormOpen(true)
                              }}
                            >
                              Assess
                            </Button>
                          ) : null}
                          {can(d, "consultations.create_record") &&
                          row.status !== "completed" ? (
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => {
                                setFormMode("edit")
                                setEditing(row)
                                setFormOpen(true)
                              }}
                            >
                              Chart
                            </Button>
                          ) : null}
                          {can(d, "consultations.record_diagnosis") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setFormMode("edit")
                                setEditing(row)
                                setFormOpen(true)
                              }}
                            >
                              Dx
                            </Button>
                          ) : null}
                          {can(d, "consultations.record_treatment") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setFormMode("edit")
                                setEditing(row)
                                setFormOpen(true)
                              }}
                            >
                              Tx
                            </Button>
                          ) : null}
                          {can(d, "consultations.record_prescription") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setFormMode("edit")
                                setEditing(row)
                                setFormOpen(true)
                              }}
                            >
                              Rx
                            </Button>
                          ) : null}
                          {can(d, "consultations.complete") &&
                          row.status !== "completed" ? (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => void completeConsultation(row)}
                            >
                              Complete
                            </Button>
                          ) : null}
                          {can(d, "consultations.generate_certificate") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                appToast.info({
                                  title: "Medical Certificate",
                                  description:
                                    "Open Medical Certificates to generate a certificate for this patient.",
                                })
                              }
                            >
                              Certificate
                            </Button>
                          ) : null}
                          {can(d, "consultations.update_record") ? (
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => setDeleting(row)}
                            >
                              Delete
                            </Button>
                          ) : null}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
      </PanelFrame>

      <PatientVisitDetailDialog
        consultation={viewing}
        patient={null}
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      />

      <ConsultationFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        consultation={editing}
        onSaved={() => refresh()}
        access={access}
      />
      <ConsultationDeleteDialog
        consultation={deleting}
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        onDeleted={() => refresh()}
      />
    </div>
  )
}

/** Compatibility export while routes migrate */
export function ConsultationsDemoPage(props: { access: StaffAccess }) {
  return (
    <ConsultationsPage
      access={props.access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 1,
      }}
      initialStats={{
        openToday: 0,
        awaitingAssessment: 0,
        inProgress: 0,
        completedToday: 0,
      }}
    />
  )
}
