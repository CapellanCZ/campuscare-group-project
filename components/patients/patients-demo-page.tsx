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
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  patientFullName,
  type PatientRecord,
  type PatientRecordListResult,
  type PatientRecordStats,
} from "@/types/patientRecord"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

function toStatCards(stats: PatientRecordStats): DemoStat[] {
  return [
    {
      key: "total",
      label: "Patients on file",
      value: String(stats.patientsOnFile),
      description: "Active student records",
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

  const loadPage = useCallback(async (nextQuery: string) => {
    setLoading(true)
    try {
      const [listResult, statsResult] = await Promise.all([
        searchPatientRecordsAction(nextQuery, {
          page: 1,
          pageSize: PAGE_SIZE,
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
  }, [])

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
      .channel("patient_records_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_records" },
        () => {
          void loadPage(debouncedQuery)
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
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

  return (
    <div className="flex flex-col gap-4">
      <DemoPageHeader
        title="Patient Records"
        description="Search student patients and open clinical profiles"
        designation={access.designation}
        showDemoBanner={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={refresh}>
              Refresh
            </Button>
            {canEdit ? (
              <Button
                size="sm"
                onClick={() => {
                  setFormMode("create")
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                Create patient
              </Button>
            ) : null}
          </div>
        }
      />

      {can(access.designation, "patients.summary_cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Patients</CardTitle>
          {can(access.designation, "patients.search") ? (
            <Input
              className="sm:w-72"
              placeholder="Search name, student ID, or course"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {showSkeleton ? (
            <PatientsTableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Blood / allergies</TableHead>
                  <TableHead>Last visit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No patient records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{patientFullName(row)}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.studentId}
                          {row.yearLevel ? ` · ${row.yearLevel}` : ""}
                        </p>
                      </TableCell>
                      <TableCell>{row.course}</TableCell>
                      <TableCell>
                        <p>{row.bloodType || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.allergies || "None"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{row.lastVisit || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.consultationsCount} consults ·{" "}
                          {row.documentsCount} docs
                        </p>
                      </TableCell>
                      <TableCell>
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
        onSaved={() => refresh()}
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
