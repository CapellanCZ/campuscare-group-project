"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { IconFileTypePdf } from "@tabler/icons-react"
import { toast } from "sonner"

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
import { applyReportsFilters } from "@/features/reports/data/apply-filters"
import { buildClinicProgressNarrative } from "@/features/reports/lib/clinic-progress-narrative"
import { downloadClinicProgressCsv } from "@/features/reports/lib/export-csv"
import { downloadClinicProgressExcel } from "@/features/reports/lib/export-excel"
import {
  buildFilterSummary,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import { printClinicProgressReport } from "@/features/reports/lib/export-pdf"
import type {
  ReportChartKey,
  ReportFilters,
  ReportKind,
  ReportsBundle,
} from "@/features/reports/types"
import { REPORT_KIND_LABELS } from "@/features/reports/types"
import {
  adminElevatedCardClassName,
  adminPageShellClassName,
} from "@/features/admin/lib/admin-surface"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { designationLabel } from "@/lib/health/roles"
import { cn } from "@/lib/utils"
import { useStaffRealtimeRouterRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

type AdminReportTab = "overview" | "consultations" | "queue" | "certificates"

const TAB_CHARTS: Record<AdminReportTab, ReportChartKey[]> = {
  overview: ["monthly_consult_trend", "patient_type_distribution"],
  consultations: ["common_health_complaints", "common_dental_cases"],
  queue: ["queue_performance"],
  certificates: [],
}

const TAB_TABLES: Record<AdminReportTab, ReportKind[]> = {
  overview: [],
  consultations: ["daily_consultation", "monthly_consultation"],
  queue: ["queue_performance"],
  certificates: ["medical_certificate"],
}

export function AdminReportsView({
  access,
  initialBundle,
}: {
  access: StaffAccess
  initialBundle: ReportsBundle
}) {
  const d = access.designation
  const [filters, setFilters] = useState<ReportFilters>(initialBundle.filters)
  const [tab, setTab] = useState<AdminReportTab>("overview")
  const [pending, startTransition] = useTransition()

  useStaffRealtimeRouterRefresh(
    `staff-reports-admin`,
    STAFF_REALTIME_TABLES.reports
  )

  useEffect(() => {
    if (initialBundle.error) {
      toast.error(initialBundle.error)
    }
  }, [initialBundle.error])

  const bundle = useMemo(
    () =>
      applyReportsFilters(
        d,
        filters,
        initialBundle.live,
        initialBundle.dataset
      ),
    [d, filters, initialBundle.live, initialBundle.dataset]
  )

  const exportPack = useMemo(() => {
    const narrative = buildClinicProgressNarrative({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      roleLabel: designationLabel(d),
      kpis: bundle.kpis,
      charts: bundle.charts,
    })
    return {
      narrative,
      kpis: bundle.kpis,
      charts: bundle.charts,
      tables: bundle.tables,
    }
  }, [
    bundle.kpis,
    bundle.charts,
    bundle.tables,
    filters.dateFrom,
    filters.dateTo,
    d,
  ])

  const cardsLevel = getAccessLevel(d, "reports.summary_cards")
  const chartsLevel = getAccessLevel(d, "reports.charts")
  const pdfLevel = getAccessLevel(d, "reports.export_pdf")
  const canExcel = can(d, "reports.export_excel")
  const canFilters = can(d, "reports.filters")
  const exportEmpty =
    exportPack.kpis.every((k) => k.value === "0" || k.value === "0 min") &&
    exportPack.charts.every((c) => c.points.length === 0) &&
    exportPack.tables.every((t) => t.rows.length === 0)

  function updateFilters(next: Partial<ReportFilters>) {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, ...next }))
    })
  }

  function exportMeta(): ExportMeta {
    return {
      reportTitle: exportPack.narrative.title,
      generatedAt: new Date().toISOString(),
      generatedBy: access.fullName,
      roleLabel: designationLabel(d),
      filterSummary: buildFilterSummary(filters),
    }
  }

  function handlePrintPdf() {
    try {
      printClinicProgressReport({ meta: exportMeta(), pack: exportPack })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open print view."
      )
    }
  }

  function handleCsv() {
    downloadClinicProgressCsv({
      meta: exportMeta(),
      pack: exportPack,
    })
    toast.success("Clinic progress CSV downloaded (overview, charts, tables).")
  }

  async function handleExcel() {
    try {
      await downloadClinicProgressExcel({
        meta: exportMeta(),
        pack: exportPack,
      })
      toast.success(
        "Clinic progress Excel downloaded (overview, charts, tables)."
      )
    } catch {
      toast.error("Could not export Excel.")
    }
  }

  function panelFor(tabId: AdminReportTab) {
    const charts = bundle.charts.filter((c) =>
      TAB_CHARTS[tabId].includes(c.key)
    )
    const tables = bundle.tables.filter((t) =>
      TAB_TABLES[tabId].includes(t.kind as ReportKind)
    )
    return (
      <div className="flex flex-col gap-4">
        {chartsLevel !== "none" && charts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {charts.map((series) => (
              <ReportChartCard key={series.key} series={series} elevated />
            ))}
          </div>
        ) : null}

        {tables.map((table) => (
          <Card
            key={table.kind}
            className={cn(adminElevatedCardClassName, "min-w-0")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {REPORT_KIND_LABELS[table.kind] ?? table.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportDataTable
                table={table}
                query={filters.query}
                onQueryChange={(query) => updateFilters({ query })}
                hideTitle
              />
            </CardContent>
          </Card>
        ))}

        {charts.length === 0 && tables.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No aggregate data for this tab.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={adminPageShellClassName("gap-8 pt-2")}>
      <PageIntro
        title="Reports"
        action={
          <div className="flex flex-wrap gap-2">
            {pdfLevel !== "none" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={exportEmpty}
                onClick={handlePrintPdf}
              >
                <IconFileTypePdf className="size-4" aria-hidden />
                Export PDF
              </Button>
            ) : null}
            {canExcel ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportEmpty}
                  onClick={handleCsv}
                >
                  Export CSV
                </Button>
                <Button size="sm" disabled={exportEmpty} onClick={handleExcel}>
                  Export Excel
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {canFilters ? (
        <Card className={cn(adminElevatedCardClassName, "sticky top-2 z-10")}>
          <CardContent className="pt-(--card-spacing)">
            <ReportsFilterBar
              designation={d}
              filters={filters}
              personnelOptions={bundle.personnelOptions}
              statusOptions={bundle.statusOptions}
              onChange={updateFilters}
            />
            {pending ? (
              <p className="mt-2 text-xs text-muted-foreground">Updating…</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {cardsLevel !== "none" ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {bundle.kpis.map((kpi) => (
            <StatCard
              key={kpi.key}
              className={adminElevatedCardClassName}
              label={kpi.label}
              value={kpi.value}
              description={kpi.description}
            />
          ))}
        </section>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (
            value === "overview" ||
            value === "consultations" ||
            value === "queue" ||
            value === "certificates"
          ) {
            setTab(value)
          }
        }}
        className="gap-4"
      >
        <TabsList variant="line" className="w-full max-w-xl justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{panelFor("overview")}</TabsContent>
        <TabsContent value="consultations">
          {panelFor("consultations")}
        </TabsContent>
        <TabsContent value="queue">{panelFor("queue")}</TabsContent>
        <TabsContent value="certificates">
          {panelFor("certificates")}
        </TabsContent>
      </Tabs>
    </div>
  )
}
