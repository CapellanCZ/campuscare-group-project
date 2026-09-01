"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { IconFileTypePdf, IconPrinter } from "@tabler/icons-react"
import { appToast } from "@/lib/feedback/app-toast"

import { AdminReportsView } from "@/features/reports/components/admin-reports-view"
import { ReportChartCard } from "@/features/reports/components/report-chart-card"
import { ReportDataTable } from "@/features/reports/components/report-data-table"
import { ReportsFilterBar } from "@/features/reports/components/reports-filter-bar"
import type { AdminReportsAggregates } from "@/features/admin/types/ops"
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
import {
  buildFilterSummary,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import {
  downloadClinicProgressPdf,
  printClinicProgressReport,
} from "@/features/reports/lib/export-pdf"
import type {
  ReportFilters,
  ReportKind,
  ReportsBundle,
} from "@/features/reports/types"
import { REPORT_KIND_LABELS } from "@/features/reports/types"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { designationLabel } from "@/lib/health/roles"
import { cn } from "@/lib/utils"
import type { AnnouncementListResult } from "@/types/announcement"
import { useStaffRealtimeRouterRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

export function ReportsAnalyticsPage({
  access,
  initialBundle,
  initialAnnouncements,
  initialAdminFilters,
  initialAdminAggregates,
}: {
  access: StaffAccess
  initialBundle?: ReportsBundle
  initialAnnouncements?: AnnouncementListResult
  initialAdminFilters?: ReportFilters
  initialAdminAggregates?: AdminReportsAggregates
}) {
  if (
    access.designation === "admin" &&
    initialAdminFilters &&
    initialAdminAggregates
  ) {
    return (
      <AdminReportsView
        access={access}
        initialFilters={initialAdminFilters}
        initialAggregates={initialAdminAggregates}
      />
    )
  }

  if (!initialBundle) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Reports data is unavailable.
      </p>
    )
  }

  return (
    <ClinicalReportsAnalyticsPage
      access={access}
      initialBundle={initialBundle}
    />
  )
}

function ClinicalReportsAnalyticsPage({
  access,
  initialBundle,
}: {
  access: StaffAccess
  initialBundle: ReportsBundle
  initialAnnouncements?: AnnouncementListResult
}) {
  const d = access.designation
  const isPhysician = d === "physician"
  const isNurse = d === "nurse"
  const isDentist = d === "dentist"
  const useStackedTables = isPhysician || isDentist
  const catalog = catalogFor(d)
  const [filters, setFilters] = useState<ReportFilters>(initialBundle.filters)
  const [pending, startTransition] = useTransition()

  useStaffRealtimeRouterRefresh(
    `staff-reports-${d}`,
    STAFF_REALTIME_TABLES.reports
  )

  useEffect(() => {
    if (initialBundle.error) {
      appToast.error({
        title: "Unable to load reports",
        description: initialBundle.error,
      })
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

  function handlePrint() {
    try {
      printClinicProgressReport({ meta: exportMeta(), pack: exportPack })
    } catch (error) {
      appToast.error({
        title: "Print failed",
        description:
          error instanceof Error ? error.message : "Could not open print view.",
      })
    }
  }

  function handleExportPdf() {
    void downloadClinicProgressPdf({
      meta: exportMeta(),
      pack: exportPack,
    })
      .then(() =>
        appToast.success({
          title: "PDF downloaded.",
          description: "Your report export has been saved.",
        })
      )
      .catch((error) => {
        appToast.error({
          title: "Export failed",
          description:
            error instanceof Error ? error.message : "Could not export PDF.",
        })
      })
  }

  const visibleKinds = catalog.reportKinds.filter((kind) => {
    if (kind.includes("certificate")) return can(d, "reports.certificate")
    return can(d, "reports.consultation")
  })
  const visibleTables = bundle.tables.filter((table) =>
    visibleKinds.includes(table.kind as ReportKind)
  )

  return (
    <div
      className={
        isPhysician
          ? "flex flex-1 flex-col gap-10 pt-2"
          : "flex flex-1 flex-col gap-8 pt-2"
      }
    >
      <PageIntro
        title="Reports and Analytics"
        action={
          <div className="flex flex-wrap gap-2">
            {pdfLevel !== "none" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportEmpty || pending}
                  onClick={handleExportPdf}
                >
                  <IconFileTypePdf className="size-4" aria-hidden />
                  Export PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={exportEmpty || pending}
                  onClick={handlePrint}
                >
                  <IconPrinter className="size-4" aria-hidden />
                  Print
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
                <CardHeader className={cn("pb-2", d === "dentist" && "pb-4")}>
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
                <PanelCell key={series.key}>
                  <ReportChartCard series={series} />
                </PanelCell>
              ))
            : null}

          {!useStackedTables ? (
          <PanelCell className="lg:col-span-3">
            <Card className={cn(panelCardClassName)}>
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Reports</CardTitle>
                  <Badge variant="outline">Live clinic data</Badge>
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
          ) : null}
        </PanelGrid>
      </PanelFrame>
      {useStackedTables ? (
        <section
          className={cn(
            "flex flex-col gap-6",
            isPhysician && "gap-10"
          )}
        >
          <div className={cn("space-y-1", isPhysician && "space-y-1.5")}>
            <h2 className="text-base font-semibold tracking-tight">Report tables</h2>
            {isDentist ? null : (
            <p className="text-sm text-muted-foreground">
              Each dataset is shown in its own table for easier scanning.
            </p>
            )}
          </div>
          {visibleTables.map((table) => (
            <Card key={table.kind} className="min-w-0 border-border/70 shadow-none dark:ring-0">
              <CardHeader
                className={cn(
                  "pb-2",
                  isDentist && "pb-4",
                  isPhysician && "px-6 pb-3 pt-6"
                )}
              >
                <CardTitle className="text-base">
                  {REPORT_KIND_LABELS[table.kind] ?? table.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <ReportDataTable
                  table={table}
                  query=""
                  onQueryChange={() => undefined}
                  hideTitle
                  independentSearch
                />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  )
}
