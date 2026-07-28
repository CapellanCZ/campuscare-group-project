"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import { PatientEditSheet } from "@/components/patients/patient-edit-sheet"
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
  fetchPatientRecordStatsAction,
  fetchPatientRecordsAction,
} from "@/features/patients/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import type {
  PatientRecord,
  PatientRecordListResult,
  PatientRecordStats,
} from "@/types/patientRecord"

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

function toStatCards(stats: PatientRecordStats): DemoStat[] {
  return [
    {
      key: "total",
      label: "Patients on file",
      value: String(stats.total),
      description: "Active records",
    },
    {
      key: "visited",
      label: "Visits this month",
      value: String(stats.visitedThisMonth),
      description: "Consultations recorded",
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
  const [page, setPage] = useState(1)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [editTarget, setEditTarget] = useState<PatientRecord | null>(null)
  const [editOpen, setEditOpen] = useState(false)
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
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, debouncedQuery])

  const loadPage = useCallback(async (nextQuery: string, nextPage: number) => {
    setLoading(true)
    try {
      const [listResult, statsResult] = await Promise.all([
        fetchPatientRecordsAction({
          query: nextQuery,
          page: nextPage,
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
      toast.error("Unable to reach the database. Check your connection.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    void loadPage(debouncedQuery, page)
  }, [debouncedQuery, page, loadPage])

  const statCards = useMemo(() => toStatCards(stats), [stats])
  const rows = list.items
  const showSkeleton = loading || isPending

  function openEdit(patient: PatientRecord) {
    setEditTarget(patient)
    setEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Patient Records"
        description="Search student patients and open clinical profiles"
        designation={access.designation}
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
          {showSkeleton && rows.length === 0 ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyTitle>No patients found</EmptyTitle>
                <EmptyDescription>
                  Patient records from the clinic directory will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
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
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.studentId ?? "—"} · {row.yearLevel ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell>{row.course ?? "—"}</TableCell>
                    <TableCell>
                      <p>{row.bloodType}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.allergies}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p>{row.lastVisit}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.consultationsCount} consults · {row.documentsCount}{" "}
                        docs
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {can(access.designation, "patients.view_profile") ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              toast.info(
                                `${row.fullName} · ${row.email ?? "No email"} · ${row.phone ?? "No phone"}`
                              )
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
                              toast.info(
                                `${row.consultationsCount} consultation(s) on file.`
                              )
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
                              toast.info("Document storage is not configured yet.")
                            }
                          >
                            Documents
                          </Button>
                        ) : null}
                        {canEdit ? (
                          <Button
                            size="xs"
                            disabled={isPending}
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {canUpdateMedical ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => openEdit(row)}
                          >
                            Medical
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {list.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || isPending}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {list.page} of {list.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= list.totalPages || isPending}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <PatientEditSheet
        open={editOpen}
        patient={editTarget}
        medicalOnly={Boolean(editTarget && !canEdit && canUpdateMedical)}
        onOpenChange={setEditOpen}
        onSaved={() => {
          startTransition(async () => {
            await loadPage(debouncedQuery, page)
          })
        }}
      />
    </div>
  )
}
