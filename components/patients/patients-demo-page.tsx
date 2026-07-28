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

import { PatientDeleteDialog } from "@/components/patients/patient-delete-dialog"
import { PatientFormSheet } from "@/components/patients/patient-form-sheet"
import { PatientHistorySheet } from "@/components/patients/patient-history-sheet"
import { PatientImportSheet } from "@/components/patients/patient-import-sheet"
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
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
  fetchPatientRecordStatsAction,
  searchPatientRecordsAction,
} from "@/features/patients/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  patientCampusId,
  patientFullName,
  type PatientRecord,
  type PatientRecordListResult,
  type PatientRecordSortColumn,
  type PatientRecordStats,
  type PatientType,
} from "@/types/patientRecord"
import { IconSearch, IconUserPlus } from "@tabler/icons-react"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

function toStatCards(stats: PatientRecordStats): DemoStat[] {
  return [
    {
      key: "total",
      label: "Patients on file",
      value: String(stats.patientsOnFile),
      description: "Students and faculty",
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
  const [patientType, setPatientType] = useState<PatientType | "all">("all")
  const [sortColumn, setSortColumn] =
    useState<PatientRecordSortColumn>("patient")
  const [sortDirection, setSortDirection] =
    useState<ColumnSortDirection>("asc")
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editing, setEditing] = useState<PatientRecord | null>(null)
  const [profilePatient, setProfilePatient] = useState<PatientRecord | null>(null)
  const [historyPatient, setHistoryPatient] = useState<PatientRecord | null>(null)
  const [deletePatient, setDeletePatient] = useState<PatientRecord | null>(null)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)

  const canEdit = can(access.designation, "patients.edit_information")
  const canUpdateMedical = can(access.designation, "patients.update_medical")
  const canViewHistory = can(
    access.designation,
    "patients.view_consultation_history"
  )
  const canViewDocs = can(access.designation, "patients.view_medical_documents")

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
      nextType: PatientType | "all",
      nextSortBy: PatientRecordSortColumn,
      nextSortDir: "asc" | "desc"
    ) => {
      setLoading(true)
      try {
        const [listResult, statsResult] = await Promise.all([
          searchPatientRecordsAction(nextQuery, {
            page: 1,
            pageSize: PAGE_SIZE,
            patientType: nextType,
            sortBy: nextSortBy,
            sortDir: nextSortDir,
          }),
          fetchPatientRecordStatsAction(),
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
      } catch {
        toast.error(
          "Unable to reach the database. Check your connection and try again."
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const activeSortDir = sortDirection === false ? "asc" : sortDirection

  const refresh = useCallback(() => {
    startTransition(() => {
      void loadPage(debouncedQuery, patientType, sortColumn, activeSortDir)
    })
  }, [
    activeSortDir,
    debouncedQuery,
    loadPage,
    patientType,
    sortColumn,
  ])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, patientType, sortColumn, activeSortDir)
  }, [activeSortDir, debouncedQuery, loadPage, patientType, sortColumn])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("patient_records_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_records" },
        () => {
          void loadPage(debouncedQuery, patientType, sortColumn, activeSortDir)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        () => {
          void loadPage(debouncedQuery, patientType, sortColumn, activeSortDir)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activeSortDir, debouncedQuery, loadPage, patientType, sortColumn])

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
    setList((prev) => {
      const exists = prev.items.some((item) => item.id === patient.id)
      if (exists) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === patient.id ? patient : item
          ),
        }
      }
      return {
        ...prev,
        items: [patient, ...prev.items].slice(0, PAGE_SIZE),
        total: prev.total + 1,
      }
    })
    refresh()
  }

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const showSkeleton = loading || isPending
  const rows = list.items

  return (
    <div className="flex flex-col gap-4">
      <DemoPageHeader
        title="Patient Records"
        description="Register and search students or faculty by campus ID"
        designation={access.designation}
        showDemoBanner={false}
      />

      {can(access.designation, "patients.summary_cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <Card className="min-w-0 gap-0 py-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b pt-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Patient directory</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {can(access.designation, "patients.search") ? (
              <div className="relative w-full sm:w-72">
                <IconSearch
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="pl-8"
                  placeholder="Search name or campus ID"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search patients"
                />
              </div>
            ) : null}
            {canEdit ? (
              <>
                <PatientImportSheet onImported={refresh} toolbar />
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setFormMode("create")
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  <IconUserPlus data-icon="inline-start" aria-hidden="true" />
                  Register patient
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showSkeleton ? (
            <PatientsTableSkeleton />
          ) : (
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
                      filterLabel="Type"
                      filterItems={
                        <>
                          <DropdownMenuItem
                            onClick={() => setPatientType("all")}
                            className={cn(patientType === "all" && "bg-accent")}
                          >
                            All types
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPatientType("student")}
                            className={cn(
                              patientType === "student" && "bg-accent"
                            )}
                          >
                            Students
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPatientType("faculty")}
                            className={cn(
                              patientType === "faculty" && "bg-accent"
                            )}
                          >
                            Faculty
                          </DropdownMenuItem>
                        </>
                      }
                    />
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <DirectoryColumnHeader
                      title="Program"
                      sortDirection={sortDirectionFor("program")}
                      onSortAsc={() => setColumnSort("program", "asc")}
                      onSortDesc={() => setColumnSort("program", "desc")}
                      onClearSort={() => setColumnSort("patient", "asc")}
                    />
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <DirectoryColumnLabel title="Blood / allergies" />
                  </TableHead>
                  <TableHead className="h-12 px-4">
                    <DirectoryColumnHeader
                      title="Last visit"
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
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No patient records found. Register one or import a roster.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{patientFullName(row)}</p>
                          <Badge variant="outline" className="capitalize">
                            {row.patientType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.patientType === "faculty"
                            ? "Employee"
                            : "Student"}{" "}
                          ID {patientCampusId(row) ?? "—"}
                          {row.yearLevel ? ` · ${row.yearLevel}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="px-4">{row.course || "—"}</TableCell>
                      <TableCell className="px-4">
                        <p>{row.bloodType || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.allergies || "None"}
                        </p>
                      </TableCell>
                      <TableCell className="px-4">
                        <p>{row.lastVisit || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.consultationsCount} consults ·{" "}
                          {row.documentsCount} docs
                        </p>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-wrap justify-end gap-1">
                          {can(access.designation, "patients.view_profile") ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setProfilePatient(row)}
                            >
                              Profile
                            </Button>
                          ) : null}
                          {canViewHistory ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setHistoryPatient(row)}
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
                          {canEdit ? (
                            <Button
                              size="xs"
                              onClick={() => {
                                setFormMode("edit")
                                setEditing(row)
                                setFormOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                          ) : null}
                          {canUpdateMedical ? (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => {
                                setFormMode("edit")
                                setEditing(row)
                                setFormOpen(true)
                              }}
                            >
                              Medical
                            </Button>
                          ) : null}
                          {canEdit ? (
                            <Button
                              size="xs"
                              variant="destructive"
                              onClick={() => setDeletePatient(row)}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PatientFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        patient={editing}
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
      />
      <PatientDeleteDialog
        patient={deletePatient}
        open={Boolean(deletePatient)}
        onOpenChange={(open) => {
          if (!open) setDeletePatient(null)
        }}
        onDeleted={() => refresh()}
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
