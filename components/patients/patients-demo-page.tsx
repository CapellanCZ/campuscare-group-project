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

import { PatientHistorySheet } from "@/components/patients/patient-history-sheet"
import { PatientMedicalSheet } from "@/components/patients/patient-medical-sheet"
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import {
  PanelFrame,
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
  ensurePatientRecordAction,
  fetchPatientRecordStatsAction,
  searchPatientRecordsAction,
} from "@/features/patients/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import { isEnrolledVirtualId } from "@/lib/students/virtual-id"
import { NO_STUDENT_FOUND } from "@/lib/students/types"
import { createClient } from "@/lib/supabase/client"
import {
  patientCampusId,
  patientFullName,
  type PatientRecord,
  type PatientRecordListResult,
  type PatientRecordSortColumn,
  type PatientRecordStats,
} from "@/types/patientRecord"
import { IconSearch, IconUsers } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

function toStatCards(stats: PatientRecordStats): DemoStat[] {
  return [
    {
      key: "total",
      label: "Patients on file",
      value: String(stats.patientsOnFile),
      description: "Enrolled students",
    },
    {
      key: "visited",
      label: "Visited this month",
      value: String(stats.visitedThisMonth),
      description: "Based on last visit",
    },
    {
      key: "allergies",
      label: "Flagged allergies",
      value: String(stats.flaggedAllergies),
      description: "Require caution",
    },
    {
      key: "docs",
      label: "Documents",
      value: String(stats.documents),
      description: "Uploaded files",
    },
  ]
}

function PatientsTableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-40" />
        </div>
      ))}
    </div>
  )
}

export function PatientsPage({
  access,
  initialList,
  initialStats,
  initialError,
}: {
  access: StaffAccess
  initialList: PatientRecordListResult
  initialStats: PatientRecordStats
  initialError?: string | null
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [sortColumn, setSortColumn] =
    useState<PatientRecordSortColumn>("patient")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("asc")
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [medicalPatient, setMedicalPatient] = useState<PatientRecord | null>(
    null
  )
  const [profilePatient, setProfilePatient] = useState<PatientRecord | null>(null)
  const [historyPatient, setHistoryPatient] = useState<PatientRecord | null>(null)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)
  const mountedRef = useRef(false)

  const canUpdateMedical = can(access.designation, "patients.update_medical")
  const canViewHistory = can(
    access.designation,
    "patients.view_consultation_history"
  )
  const canViewDocs = can(access.designation, "patients.view_medical_documents")

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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

  const loadPage = useCallback(
    async (
      nextQuery: string,
      nextSortBy: PatientRecordSortColumn,
      nextSortDir: "asc" | "desc"
    ) => {
      setLoading(true)
      try {
        const [listResult, statsResult] = await Promise.all([
          searchPatientRecordsAction(nextQuery, {
            page: 1,
            pageSize: PAGE_SIZE,
            patientType: "student",
            sortBy: nextSortBy,
            sortDir: nextSortDir,
          }),
          fetchPatientRecordStatsAction(),
        ])
        if (!mountedRef.current) return
        if (!listResult.ok) {
          if (listResult.error === NO_STUDENT_FOUND) {
            setList({
              items: [],
              total: 0,
              page: 1,
              pageSize: PAGE_SIZE,
              totalPages: 1,
            })
            toast.error(NO_STUDENT_FOUND)
            return
          }
          toast.error(listResult.error)
          return
        }
        if (!statsResult.ok) {
          toast.error(statsResult.error)
          return
        }
        setList(listResult.data)
        setStats(statsResult.data)
      } catch {
        if (!mountedRef.current) return
        toast.error(
          "Unable to reach the database. Check your connection and try again."
        )
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    },
    []
  )

  const activeSortDir = sortDirection === false ? "asc" : sortDirection

  const refresh = useCallback(() => {
    startTransition(() => {
      void loadPage(debouncedQuery, sortColumn, activeSortDir)
    })
  }, [activeSortDir, debouncedQuery, loadPage, sortColumn])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, sortColumn, activeSortDir)
  }, [activeSortDir, debouncedQuery, loadPage, sortColumn])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("patient_records_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_records" },
        () => {
          void loadPage(debouncedQuery, sortColumn, activeSortDir)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        () => {
          void loadPage(debouncedQuery, sortColumn, activeSortDir)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activeSortDir, debouncedQuery, loadPage, sortColumn])

  function setColumnSort(
    column: PatientRecordSortColumn,
    direction: ColumnSortDirection
  ) {
    setSortColumn(column)
    setSortDirection(direction)
  }

  function sortDirectionFor(
    column: PatientRecordSortColumn
  ): ColumnSortDirection {
    return sortColumn === column ? sortDirection : false
  }

  function handleSaved(patient: PatientRecord) {
    setList((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === patient.id ||
        (patient.studentId != null && item.studentId === patient.studentId)
          ? patient
          : item
      ),
    }))
    refresh()
  }

  async function openEnsuredPatient(
    patient: PatientRecord,
    then: (ensured: PatientRecord) => void
  ) {
    if (!isEnrolledVirtualId(patient.id)) {
      then(patient)
      return
    }
    setLoading(true)
    try {
      const result = await ensurePatientRecordAction(patient)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setList((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.studentId === result.data.studentId ? result.data : item
        ),
      }))
      then(result.data)
    } catch {
      toast.error("Could not sync enrolled student into patient records.")
    } finally {
      setLoading(false)
    }
  }

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const showSkeleton = loading || isPending
  const rows = list.items
  const emptyMessage = debouncedQuery
    ? NO_STUDENT_FOUND
    : "No enrolled students found. Check the Student Dataset file in Storage."

  return (
    <div className="flex flex-col gap-6">
      <DemoPageHeader
        title="Patient Records"
        description="Enrolled student medical records. Search by Student ID; update medical history and physical exam here."
        designation={access.designation}
        showDemoBanner={false}
      />

      {can(access.designation, "patients.summary_cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <PanelFrame>
        <Card className={cn(panelCardClassName, "gap-0 py-0")}>
        <CardHeader className="flex flex-col gap-3 border-b pt-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Student directory</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {can(access.designation, "patients.search") ? (
              <div className="relative w-full sm:w-72">
                <IconSearch
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="pl-8"
                  placeholder="Search by Student ID Number"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search by Student ID Number"
                />
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="min-w-0 p-0">
          {showSkeleton ? (
            <PatientsTableSkeleton />
          ) : rows.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconUsers aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No patients found</EmptyTitle>
                <EmptyDescription>{emptyMessage}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-4">
                    <DirectoryColumnHeader
                      title="Patient"
                      sortDirection={sortDirectionFor("patient")}
                      onSortAsc={() => setColumnSort("patient", "asc")}
                      onSortDesc={() => setColumnSort("patient", "desc")}
                      onClearSort={() => setColumnSort("patient", "asc")}
                    />
                  </TableHead>
                  <TableHead className="hidden h-12 px-4 md:table-cell">
                    <DirectoryColumnHeader
                      title="Program"
                      sortDirection={sortDirectionFor("program")}
                      onSortAsc={() => setColumnSort("program", "asc")}
                      onSortDesc={() => setColumnSort("program", "desc")}
                      onClearSort={() => setColumnSort("patient", "asc")}
                    />
                  </TableHead>
                  <TableHead className="hidden h-12 px-4 lg:table-cell">
                    <DirectoryColumnLabel title="Allergies / flags" />
                  </TableHead>
                  <TableHead className="hidden h-12 px-4 sm:table-cell">
                    <DirectoryColumnHeader
                      title="Last edited"
                      sortDirection={sortDirectionFor("lastVisit")}
                      onSortAsc={() => setColumnSort("lastVisit", "asc")}
                      onSortDesc={() => setColumnSort("lastVisit", "desc")}
                      onClearSort={() => setColumnSort("patient", "asc")}
                    />
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">
                    <DirectoryColumnLabel
                      title="Actions"
                      className="justify-end"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{patientFullName(row)}</p>
                          <Badge variant="outline">Student</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Student ID {patientCampusId(row) ?? "—"}
                          {row.yearLevel ? ` · ${row.yearLevel}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="hidden px-4 md:table-cell">
                        {row.course || "—"}
                      </TableCell>
                      <TableCell className="hidden px-4 lg:table-cell">
                        <p className="text-sm">
                          {row.allergies ||
                            (row.medicalHistory?.allergy
                              ? "Allergy noted"
                              : "None")}
                        </p>
                      </TableCell>
                      <TableCell className="hidden px-4 sm:table-cell">
                        <p>
                          {row.lastEditedAt
                            ? new Date(row.lastEditedAt).toLocaleString(
                                "en-PH",
                                {
                                  timeZone: "Asia/Manila",
                                  dateStyle: "medium",
                                }
                              )
                            : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.lastEditedByName
                            ? `by ${row.lastEditedByName}`
                            : row.lastEditedAt
                              ? "Editor unknown"
                              : "Never edited"}
                        </p>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-wrap justify-end gap-1">
                          {can(access.designation, "patients.view_profile") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                void openEnsuredPatient(row, setProfilePatient)
                              }
                            >
                              Profile
                            </Button>
                          ) : null}
                          {canViewHistory ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                void openEnsuredPatient(row, setHistoryPatient)
                              }
                            >
                              History
                            </Button>
                          ) : null}
                          {canViewDocs ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                toast.info(
                                  "Medical documents will be available when the documents module is ready."
                                )
                              }
                            >
                              Documents
                            </Button>
                          ) : null}
                          {canUpdateMedical ? (
                            <Button
                              size="xs"
                              onClick={() =>
                                void openEnsuredPatient(row, setMedicalPatient)
                              }
                            >
                              Update medical
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

      <PatientMedicalSheet
        patient={medicalPatient}
        open={Boolean(medicalPatient)}
        onOpenChange={(open) => {
          if (!open) setMedicalPatient(null)
        }}
        onSaved={handleSaved}
      />
      <PatientProfileSheet
        patient={profilePatient}
        open={Boolean(profilePatient)}
        onOpenChange={(open) => {
          if (!open) setProfilePatient(null)
        }}
      />
      <PatientHistorySheet
        patient={historyPatient}
        open={Boolean(historyPatient)}
        onOpenChange={(open) => {
          if (!open) setHistoryPatient(null)
        }}
        stationFilter={
          access.designation === "dentist" ? "dentist" : "all"
        }
      />
    </div>
  )
}

export function PatientsDemoPage(props: {
  access: StaffAccess
  initialList?: PatientRecordListResult
  initialStats?: PatientRecordStats
  initialError?: string | null
}) {
  return (
    <PatientsPage
      access={props.access}
      initialList={
        props.initialList ?? {
          items: [],
          total: 0,
          page: 1,
          pageSize: PAGE_SIZE,
          totalPages: 1,
        }
      }
      initialStats={
        props.initialStats ?? {
          patientsOnFile: 0,
          visitedThisMonth: 0,
          flaggedAllergies: 0,
          documents: 0,
        }
      }
      initialError={props.initialError}
    />
  )
}
