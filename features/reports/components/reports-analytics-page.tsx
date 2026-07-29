"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { ReportChartCard } from "@/features/reports/components/report-chart-card"
import { ReportDataTable } from "@/features/reports/components/report-data-table"
import { ReportsFilterBar } from "@/features/reports/components/reports-filter-bar"
import {
  PageIntro,
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { catalogFor } from "@/features/reports/role-catalog"
import { applyReportsFilters } from "@/features/reports/data/apply-filters"
import { buildClinicProgressNarrative } from "@/features/reports/lib/clinic-progress-narrative"
import { downloadClinicProgressCsv } from "@/features/reports/lib/export-csv"
import { downloadClinicProgressExcel } from "@/features/reports/lib/export-excel"
import {
  buildFilterSummary,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import { printClinicProgressReport } from "@/features/reports/lib/export-pdf"
import type { ReportFilters, ReportKind, ReportsBundle } from "@/features/reports/types"
import { REPORT_KIND_LABELS } from "@/features/reports/types"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { designationLabel } from "@/lib/health/roles"
import { cn } from "@/lib/utils"

export function ReportsAnalyticsPage({
  access,
  initialBundle,
}: {
  access: StaffAccess
  initialBundle: ReportsBundle
}) {
  const d = access.designation
  const catalog = catalogFor(d)
  const [filters, setFilters] = useState<ReportFilters>(initialBundle.filters)
  const [pending, startTransition] = useTransition()

  const liveSeed = useMemo(
    () => ({
      completedToday: Number(
        initialBundle.kpis.find((k) => k.key.includes("today"))?.value ?? 0
      ),
      walkIns: Number(
        initialBundle.kpis.find((k) => k.key === "walk_ins")?.value ?? 0
      ),
      avgWait: Number.parseInt(
        initialBundle.kpis.find((k) => k.key === "avg_wait")?.value ?? "0",
        10
      ) || 0,
      pendingRequests: Number(
        initialBundle.kpis.find((k) => k.key === "pending_requests")?.value ?? 0
      ),
      certsToday: Number(
        initialBundle.kpis.find((k) => k.key === "certs_issued")?.value ?? 0
      ),
    }),
    [initialBundle.kpis]
  )

  const bundle = useMemo(
    () =>
      applyReportsFilters(d, filters, liveSeed) as Omit<
        ReportsBundle,
        "generatedAt" | "source"
      > &
        Partial<Pick<ReportsBundle, "generatedAt" | "source">>,
    [d, filters, liveSeed]
  )

  const activeTable =
    bundle.tables.find((t) => t.kind === filters.reportKind) ??
    bundle.tables[0]

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
  }, [bundle.kpis, bundle.charts, bundle.tables, filters.dateFrom, filters.dateTo, d])

  const cardsLevel = getAccessLevel(d, "reports.summary_cards")
  const chartsLevel = getAccessLevel(d, "reports.charts")
  const pdfLevel = getAccessLevel(d, "reports.export_pdf")
  const canExcel = can(d, "reports.export_excel")
  const canFilters = can(d, "reports.filters")
  const exportEmpty =
    exportPack.kpis.length === 0 &&
    exportPack.charts.length === 0 &&
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
      toast.success("Clinic progress Excel downloaded (overview, charts, tables).")
    } catch {
      toast.error("Could not export Excel.")
    }
  }

  const visibleKinds = catalog.reportKinds.filter((kind) => {
    if (kind.includes("certificate")) return can(d, "reports.certificate")
    return can(d, "reports.consultation")
  })

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageIntro
        title="Reports & Analytics"
        description={`${designationLabel(d)} clinic reports · quarterly HSO progress exports include narrative, KPIs, charts, and all tables`}
        action={
          <div className="flex flex-wrap gap-2">
            {pdfLevel !== "none" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={exportEmpty}
                onClick={handlePrintPdf}
              >
                {pdfLevel === "view" ? "Print / PDF" : "Export PDF"}
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

      <PanelFrame>
        <PanelGrid className="lg:grid-cols-3">
          {canFilters ? (
            <PanelCell className="lg:col-span-3">
              <Card className={cn(panelCardClassName)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReportsFilterBar
                    designation={d}
                    filters={filters}
                    personnelOptions={bundle.personnelOptions}
                    statusOptions={bundle.statusOptions}
                    onChange={updateFilters}
                  />
                  {pending ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Updating…
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </PanelCell>
          ) : null}

          {cardsLevel !== "none"
            ? bundle.kpis.map((kpi) => (
                <PanelCell key={kpi.key}>
                  <StatCard
                    flush
                    label={kpi.label}
                    value={kpi.value}
                    description={kpi.description}
                  />
                </PanelCell>
              ))
            : null}

          {chartsLevel !== "none"
            ? bundle.charts.map((series) => (
                <PanelCell
                  key={series.key}
                  className={
                    series.kind === "pie" ? undefined : "md:col-span-1 lg:col-span-1"
                  }
                >
                  <ReportChartCard series={series} />
                </PanelCell>
              ))
            : null}

          <PanelCell className="lg:col-span-3">
            <Card className={cn(panelCardClassName)}>
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Reports</CardTitle>
                  <Badge variant="outline">
                    {initialBundle.source === "live+seed"
                      ? "Live + clinic dataset"
                      : "Clinic dataset"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleKinds.map((kind) => (
                    <Button
                      key={kind}
                      size="sm"
                      variant={
                        filters.reportKind === kind ? "default" : "outline"
                      }
                      onClick={() =>
                        updateFilters({ reportKind: kind as ReportKind })
                      }
                    >
                      {REPORT_KIND_LABELS[kind]}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {activeTable ? (
                  <ReportDataTable
                    table={activeTable}
                    query={filters.query}
                    onQueryChange={(query) => updateFilters({ query })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No report available for this role.
                  </p>
                )}
              </CardContent>
            </Card>
          </PanelCell>
        </PanelGrid>
      </PanelFrame>
    </div>
  )
}
