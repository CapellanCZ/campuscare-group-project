"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { IconFileTypePdf, IconPrinter } from "@tabler/icons-react"
import { toast } from "sonner"

import { reloadAdminReportsAction } from "@/features/admin/actions/reports"
import type { AdminReportsAggregates } from "@/features/admin/types/ops"
import {
  adminElevatedCardClassName,
  adminPageShellClassName,
} from "@/features/admin/lib/admin-surface"
import { ReportChartCard } from "@/features/reports/components/report-chart-card"
import { ReportDataTable } from "@/features/reports/components/report-data-table"
import { ReportsFilterBar } from "@/features/reports/components/reports-filter-bar"
import { PageIntro } from "@/components/layout/panel-frame"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defaultFiltersFor } from "@/features/reports/data/apply-filters"
import { downloadClinicProgressCsv } from "@/features/reports/lib/export-csv"
import { downloadClinicProgressExcel } from "@/features/reports/lib/export-excel"
import {
  buildFilterSummary,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import { printClinicProgressReport } from "@/features/reports/lib/export-pdf"
import type {
  ReportChartSeries,
  ReportFilters,
  ReportKpi,
  ReportKind,
  ReportTableBundle,
} from "@/features/reports/types"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { designationLabel } from "@/lib/health/roles"
import { cn } from "@/lib/utils"
import { useStaffRealtimeRouterRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

type AdminReportTab =
  | "operations"
  | "consultations"
  | "patients"
  | "queue"
  | "requests"
  | "certificates"

const TAB_CHARTS: Record<AdminReportTab, string[]> = {
  operations: [
    "consult_volume_trend",
    "medical_dental_donut",
    "patient_type_distribution",
  ],
  consultations: ["consult_volume_trend", "utilization_hbar"],
  patients: ["patient_type_bar", "patient_type_distribution"],
  queue: ["avg_wait_trend", "hourly_queue_volume"],
  requests: ["request_status_bar"],
  certificates: [],
}

const TAB_TABLES: Record<AdminReportTab, string[]> = {
  operations: ["daily_consultation"],
  consultations: ["daily_consultation"],
  patients: ["daily_consultation"],
  queue: ["queue_performance"],
  requests: ["consultation_request"],
  certificates: ["medical_certificate"],
}

const TAB_KPIS: Record<AdminReportTab, string[]> = {
  operations: [
    "total_consultations",
    "patients_served",
    "certs_issued",
    "avg_wait",
  ],
  consultations: ["total_consultations", "patients_served"],
  patients: ["patients_served"],
  queue: ["avg_wait", "avg_service", "patients_served", "peak_queue"],
  requests: ["total_consultations"],
  certificates: ["certs_issued"],
}

function toReportCharts(
  charts: AdminReportsAggregates["charts"]
): ReportChartSeries[] {
  return charts.map((c) => ({
    key: c.key as ReportChartSeries["key"],
    title: c.title,
    description: c.description,
    kind:
      c.kind === "hbar" || c.kind === "multiline"
        ? c.kind === "hbar"
          ? "bar"
          : "line"
        : c.kind,
    points: c.points,
  }))
}

export function AdminReportsView({
  access,
  initialFilters,
  initialAggregates,
}: {
  access: StaffAccess
  initialFilters: ReportFilters
  initialAggregates: AdminReportsAggregates
}) {
  const d = access.designation
  const [draft, setDraft] = useState(initialFilters)
  const [applied, setApplied] = useState(initialFilters)
  const [aggregates, setAggregates] = useState(initialAggregates)
  const [tab, setTab] = useState<AdminReportTab>("operations")
  const [pending, startTransition] = useTransition()

  useStaffRealtimeRouterRefresh(
    `staff-reports-admin`,
    STAFF_REALTIME_TABLES.reports
  )

  useEffect(() => {
    if (initialAggregates.error) toast.error(initialAggregates.error)
  }, [initialAggregates.error])

  const chartsLevel = getAccessLevel(d, "reports.charts")
  const cardsLevel = getAccessLevel(d, "reports.summary_cards")
  const pdfLevel = getAccessLevel(d, "reports.export_pdf")
  const canExcel = can(d, "reports.export_excel")
  const canFilters = can(d, "reports.filters")

  const kpis = useMemo(
    () =>
      aggregates.kpis.map((k) => ({
        key: k.key,
        label: k.label,
        value: k.value,
        description: k.description,
      })),
    [aggregates.kpis]
  )

  const charts = useMemo(
    () => aggregates.charts,
    [aggregates.charts]
  )

  const tables: ReportTableBundle[] = useMemo(
    () =>
      aggregates.tables.map((t) => ({
        kind: t.kind as ReportKind,
        title: t.title,
        columns: t.columns,
        rows: t.rows,
      })),
    [aggregates.tables]
  )

  const exportEmpty =
    kpis.every((k) => k.value === "0" || k.value === "0 min" || k.value === "—") &&
    charts.every((c) => c.points.every((p) => p.value === 0)) &&
    tables.every((t) => t.rows.length === 0)

  function applyFilters() {
    startTransition(async () => {
      const next = await reloadAdminReportsAction({
        dateFrom: draft.dateFrom,
        dateTo: draft.dateTo,
        consultationType: draft.consultationType,
        patientType: draft.patientType,
        status: draft.status,
      })
      setApplied(draft)
      setAggregates(next)
      if (next.error) toast.error(next.error)
      else toast.success("Filters applied.")
    })
  }

  function clearFilters() {
    const cleared = defaultFiltersFor("admin")
    setDraft(cleared)
    startTransition(async () => {
      const next = await reloadAdminReportsAction({
        dateFrom: cleared.dateFrom,
        dateTo: cleared.dateTo,
        consultationType: cleared.consultationType,
        patientType: cleared.patientType,
        status: cleared.status,
      })
      setApplied(cleared)
      setAggregates(next)
      toast.success("Filters cleared.")
    })
  }

  function exportMeta(): ExportMeta {
    return {
      reportTitle: "HSO Operations Report",
      generatedAt: new Date().toISOString(),
      generatedBy: access.fullName,
      roleLabel: designationLabel(d),
      filterSummary: buildFilterSummary(applied),
    }
  }

  const exportPack = useMemo(() => {
    const findKpi = (key: string) => kpis.find((k) => k.key === key)?.value ?? "0"
    const narrative = {
      title: "HSO Operations Report",
      periodLabel: `${applied.dateFrom} to ${applied.dateTo}`,
      executiveSummary: `Aggregated clinic operations for ${applied.dateFrom} to ${applied.dateTo}. This report contains operational counts only — no patient clinical details.`,
      operationalProgress: `Consultations: ${findKpi("total_consultations")}; patients served: ${findKpi("patients_served")}; average wait: ${findKpi("avg_wait")}.`,
      healthConcerns:
        "Clinical complaint and diagnosis analytics are withheld from Admin exports.",
      serviceCapacity: `Certificates issued: ${findKpi("certs_issued")}. Peak queue period: ${findKpi("peak_queue")}.`,
      closing:
        "Use this summary for staffing and capacity planning. Clinical record review remains with Nurses, Physicians, and Dentists.",
    }
    return {
      narrative,
      kpis: kpis as ReportKpi[],
      charts: toReportCharts(charts),
      tables,
    }
  }, [applied.dateFrom, applied.dateTo, charts, kpis, tables])

  function panelFor(tabId: AdminReportTab) {
    const tabKpis = kpis.filter((k) => TAB_KPIS[tabId].includes(k.key))
    const tabCharts = charts.filter((c) => TAB_CHARTS[tabId].includes(c.key))
    const tabTables = tables.filter((t) => TAB_TABLES[tabId].includes(t.kind))

    const studentCard = charts
      .find((c) => c.key === "patient_type_bar")
      ?.points.find((p) => p.label.startsWith("Students"))
    const facultyCard = charts
      .find((c) => c.key === "patient_type_bar")
      ?.points.find((p) => p.label.startsWith("Faculty"))

    return (
      <div className="flex flex-col gap-4">
        {cardsLevel !== "none" && tabKpis.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tabKpis.map((kpi) => (
              <StatCard
                key={kpi.key}
                className={adminElevatedCardClassName}
                label={kpi.label}
                value={kpi.value}
                description={kpi.description}
              />
            ))}
          </div>
        ) : null}

        {tabId === "patients" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              className={adminElevatedCardClassName}
              label="Students served"
              value={String(studentCard?.value ?? 0)}
            />
            <StatCard
              className={adminElevatedCardClassName}
              label="Faculty / employees served"
              value={String(facultyCard?.value ?? 0)}
            />
            <StatCard
              className={adminElevatedCardClassName}
              label="Non-teaching (not tracked)"
              value="—"
              description="Schema supports student | faculty only"
            />
            <StatCard
              className={adminElevatedCardClassName}
              label="Total patients served"
              value={String(
                (studentCard?.value ?? 0) + (facultyCard?.value ?? 0)
              )}
            />
          </div>
        ) : null}

        {tabId === "consultations" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              className={adminElevatedCardClassName}
              label="Total consultations"
              value={
                kpis.find((k) => k.key === "total_consultations")?.value ?? "0"
              }
            />
            <StatCard
              className={adminElevatedCardClassName}
              label="Medical"
              value={String(
                charts
                  .find((c) => c.key === "utilization_hbar")
                  ?.points.find((p) => p.label === "Medical")?.value ?? 0
              )}
            />
            <StatCard
              className={adminElevatedCardClassName}
              label="Dental"
              value={String(
                charts
                  .find((c) => c.key === "utilization_hbar")
                  ?.points.find((p) => p.label === "Dental")?.value ?? 0
              )}
            />
          </div>
        ) : null}

        {chartsLevel !== "none" && tabCharts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {tabCharts.map((series) => (
              <ReportChartCard
                key={series.key}
                elevated
                series={{
                  key: series.key,
                  title: series.title,
                  description: series.description,
                  kind: series.kind,
                  points: series.points,
                }}
              />
            ))}
          </div>
        ) : null}

        {tabTables.map((table) => (
          <Card
            key={table.kind}
            className={cn(adminElevatedCardClassName, "min-w-0")}
          >
            <CardHeader className="border-b">
              <CardTitle className="text-base">{table.title}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-(--card-spacing)">
              <ReportDataTable
                table={table}
                query={draft.query}
                onQueryChange={(query) =>
                  setDraft((prev) => ({ ...prev, query }))
                }
              />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={adminPageShellClassName("gap-6")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageIntro
          title="Reports"
          description="Operational performance analytics. Aggregated counts only — no clinical patient details."
        />
        <div className="flex flex-wrap gap-2">
          {pdfLevel !== "none" ? (
            <>
              <Button
                variant="outline"
                disabled={exportEmpty || pending}
                onClick={() => {
                  try {
                    printClinicProgressReport({
                      meta: exportMeta(),
                      pack: exportPack,
                    })
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Could not open print view."
                    )
                  }
                }}
              >
                <IconFileTypePdf className="size-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                disabled={exportEmpty || pending}
                onClick={() => {
                  try {
                    printClinicProgressReport({
                      meta: exportMeta(),
                      pack: exportPack,
                    })
                  } catch {
                    toast.error("Could not open print view.")
                  }
                }}
              >
                <IconPrinter className="size-4" />
                Print
              </Button>
            </>
          ) : null}
          {canExcel ? (
            <>
              <Button
                variant="outline"
                disabled={exportEmpty || pending}
                onClick={() => {
                  downloadClinicProgressCsv({
                    meta: exportMeta(),
                    pack: exportPack,
                  })
                  toast.success("CSV downloaded.")
                }}
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                disabled={exportEmpty || pending}
                onClick={() => {
                  void downloadClinicProgressExcel({
                    meta: exportMeta(),
                    pack: exportPack,
                  })
                    .then(() => toast.success("Excel downloaded."))
                    .catch(() => toast.error("Could not export Excel."))
                }}
              >
                Export Excel
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {canFilters ? (
        <Card className={cn(adminElevatedCardClassName, "shadow-none")}>
          <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
            <ReportsFilterBar
              designation="admin"
              filters={draft}
              personnelOptions={[]}
              statusOptions={aggregates.statusOptions}
              onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={pending} onClick={applyFilters}>
                {pending ? "Applying…" : "Apply Filters"}
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as AdminReportTab)}
        className="gap-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>
        {(
          [
            "operations",
            "consultations",
            "patients",
            "queue",
            "requests",
            "certificates",
          ] as AdminReportTab[]
        ).map((id) => (
          <TabsContent key={id} value={id} className="mt-0">
            {panelFor(id)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
