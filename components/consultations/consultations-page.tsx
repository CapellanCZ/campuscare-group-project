"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { ConsultationChartSheet } from "@/components/consultations/consultation-chart-sheet"
import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
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
  completeConsultationAction,
  fetchConsultationStatsAction,
  fetchConsultationsAction,
  recordConsultationAssessmentAction,
} from "@/features/consultations/actions"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import type {
  Consultation,
  ConsultationListResult,
  ConsultationStats,
  ConsultationStatus,
} from "@/types/consultation"

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

const statusLabel: Record<ConsultationStatus, string> = {
  awaiting_assessment: "Awaiting assessment",
  in_progress: "In progress",
  completed: "Completed",
}

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

export function ConsultationsPage({
  access,
  initialList,
  initialStats,
  initialError,
}: {
  access: StaffAccess
  initialList: ConsultationListResult
  initialStats: ConsultationStats
  initialError?: string | null
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [list, setList] = useState(initialList)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [chartTarget, setChartTarget] = useState<Consultation | null>(null)
  const [chartOpen, setChartOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const skipNextFetch = useRef(true)

  const d = access.designation

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
        fetchConsultationsAction({
          query: nextQuery,
          page: nextPage,
          pageSize: PAGE_SIZE,
        }),
        fetchConsultationStatsAction(),
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

  function openChart(consultation: Consultation) {
    setChartTarget(consultation)
    setChartOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Consultations"
        description="Triage assessments and clinical charting"
        designation={d}
      />

      {can(d, "consultations.cards") ? (
        <DemoStatGrid stats={statCards} />
      ) : null}

      <Card className="min-w-0 shadow-none dark:ring-0">
        <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Today&apos;s consultations</CardTitle>
          <Input
            className="sm:w-72"
            placeholder="Search patient or complaint"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
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
                <EmptyTitle>No consultations today</EmptyTitle>
                <EmptyDescription>
                  Consultations are created when patients enter the queue workflow.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.studentId} · {row.chiefComplaint}
                      </p>
                    </TableCell>
                    <TableCell className="capitalize">{row.station}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabel[row.status]}</Badge>
                    </TableCell>
                    <TableCell>{row.provider}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {can(d, "consultations.view_patient") ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              toast.info(`${row.patientName} · ${row.studentId}`)
                            }
                          >
                            Patient
                          </Button>
                        ) : null}
                        {can(d, "consultations.record_initial_assessment") &&
                        !row.hasAssessment ? (
                          <Button
                            size="xs"
                            disabled={isPending}
                            onClick={() => {
                              const notes = window.prompt(
                                "Initial assessment notes",
                                row.assessmentNotes ?? ""
                              )
                              if (notes === null) return
                              startTransition(async () => {
                                const result =
                                  await recordConsultationAssessmentAction({
                                    id: row.id,
                                    assessmentNotes: notes,
                                    providerName: access.fullName,
                                  })
                                if (!result.ok) {
                                  toast.error(result.error)
                                  return
                                }
                                toast.success("Assessment recorded.")
                                await loadPage(debouncedQuery, page)
                              })
                            }}
                          >
                            Assess
                          </Button>
                        ) : null}
                        {can(d, "consultations.create_record") &&
                        row.status !== "completed" ? (
                          <Button size="xs" onClick={() => openChart(row)}>
                            Chart
                          </Button>
                        ) : null}
                        {can(d, "consultations.complete") &&
                        row.status !== "completed" ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                const result = await completeConsultationAction(
                                  row.id
                                )
                                if (!result.ok) {
                                  toast.error(result.error)
                                  return
                                }
                                toast.success("Consultation completed.")
                                await loadPage(debouncedQuery, page)
                              })
                            }
                          >
                            Complete
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

      <ConsultationChartSheet
        open={chartOpen}
        consultation={chartTarget}
        onOpenChange={setChartOpen}
        onSaved={() => {
          startTransition(async () => {
            await loadPage(debouncedQuery, page)
          })
        }}
      />
    </div>
  )
}
