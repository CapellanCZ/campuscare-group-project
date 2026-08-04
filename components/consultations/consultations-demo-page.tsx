"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { toast } from "sonner"

import { ConsultationDeleteDialog } from "@/components/consultations/consultation-delete-dialog"
import { ConsultationFormSheet } from "@/components/consultations/consultation-form-sheet"
import { StudentIdSearchInput } from "@/components/shared/student-id-search-input"
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
import { formatStudentIdInput } from "@/lib/students/student-id-input"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  CONSULTATION_STATUSES,
  type Consultation,
  type ConsultationListResult,
  type ConsultationStats,
  type ConsultationStatus,
} from "@/types/consultation"
import { IconStethoscope } from "@tabler/icons-react"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

function toStatCards(stats: ConsultationStats): DemoStat[] {
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
  const [stationFilter, setStationFilter] = useState(
    access.designation === "dentist"
      ? "dentist"
      : access.designation === "physician"
        ? "physician"
        : "all"
  )
  const [dateFilter, setDateFilter] = useState("")
  const [providers, setProviders] = useState(initialProviders)
  const [stations, setStations] = useState(initialStations)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<Consultation | null>(null)
  const [deleting, setDeleting] = useState<Consultation | null>(null)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)
  const d = access.designation
  const isPhysician = d === "physician"
  const isNurse = d === "nurse"

  useEffect(() => {
    if (initialError) toast.error(initialError)
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
      provider: isPhysician || isNurse ? "all" : providerFilter,
      station: isPhysician ? "physician" : isNurse ? "all" : stationFilter,
      consultationDate: dateFilter || "all",
      studentIdOnly: isPhysician || isNurse,
    }),
    [statusFilter, providerFilter, stationFilter, dateFilter, isPhysician, isNurse]
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
          toast.error(listResult.error)
          return
        }
        if (!statsResult.ok) {
          toast.error(statsResult.error)
          return
        }
        setList(listResult.data)
        setStats(statsResult.data)
        if (optionsResult.ok) {
          setProviders(optionsResult.data.providers)
          setStations(optionsResult.data.stations)
        }
      } catch {
        toast.error(
          "Unable to reach the database. Check your connection and try again."
        )
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

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const showSkeleton = loading || isPending
  const rows = list.items

  async function patchConsultation(
    row: Consultation,
    patch: Partial<{
      assessment: string
      diagnosis: string
      treatment: string
      prescription: string
      status: ConsultationStatus
    }>,
    successMessage: string
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
      toast.error(result.error)
      return
    }
    toast.success(successMessage)
    refresh()
  }

  return (
    <div className="flex flex-col gap-8 pt-2">
      <DemoPageHeader
        title={d === "dentist" ? "Dental consultations" : "Consultations"}
        description={
          isNurse || isPhysician
            ? ""
            : d === "dentist"
              ? "Dental examination, diagnosis, treatment, and follow-up charting"
              : "Triage assessments and clinical charting"
        }
        designation={d}
        showDemoBanner={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={refresh}>
              Refresh
            </Button>
            {can(d, "consultations.create_record") ||
            can(d, "consultations.record_initial_assessment") ? (
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
          <CardTitle className="text-base">Today&apos;s consultations</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {isPhysician || isNurse ? (
              <StudentIdSearchInput
                className="w-full min-w-[12rem] sm:w-56"
                value={query}
                onChange={setQuery}
                placeholder="Search by student ID number"
                aria-label="Search by student ID number"
              />
            ) : (
              <Input
                className="w-full min-w-[12rem] sm:w-56"
                placeholder="e.g. 2023-172065"
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                value={query}
                onChange={(e) => setQuery(formatStudentIdInput(e.target.value))}
                onKeyDown={(e) => {
                  if (
                    e.key.length === 1 &&
                    /[a-zA-Z]/.test(e.key) &&
                    !e.ctrlKey &&
                    !e.metaKey &&
                    !e.altKey
                  ) {
                    e.preventDefault()
                  }
                }}
                aria-label="Search by Student ID"
              />
            )}
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
                {CONSULTATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isPhysician && !isNurse ? (
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
            <Input
              type="date"
              className="w-[160px]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
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
                  Adjust filters or create a consultation to get started.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Station</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Provider</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.patient.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.patient.studentId} ·{" "}
                          {row.chiefComplaint || "No complaint"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden capitalize sm:table-cell">
                        {row.station || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {row.providerName || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          {can(d, "consultations.view_patient") ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                toast.info(
                                  `${row.patient.fullName} · ${row.patient.studentId}`
                                )
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
                          row.status !== "Completed" ? (
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
                          row.status !== "Completed" ? (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() =>
                                void patchConsultation(
                                  row,
                                  { status: "Completed" },
                                  "Consultation completed."
                                )
                              }
                            >
                              Complete
                            </Button>
                          ) : null}
                          {can(d, "consultations.generate_certificate") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                toast.info(
                                  "Open Medical Certificates to generate a certificate for this patient."
                                )
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </PanelFrame>

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
