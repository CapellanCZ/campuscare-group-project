"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { appToast } from "@/lib/feedback/app-toast"

import { AdminReportsView } from "@/features/reports/components/admin-reports-view"
import { ReportsDashboardView } from "@/features/reports/components/reports-dashboard-view"
import type { AdminReportsAggregates } from "@/features/admin/types/ops"
import { applyReportsFilters } from "@/features/reports/data/apply-filters"
import { defaultFiltersFor } from "@/features/reports/data/apply-filters"
import { fetchReportsBundleAction } from "@/features/reports/actions"
import { buildClinicProgressNarrative } from "@/features/reports/lib/clinic-progress-narrative"
import {
  buildFilterSummary,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import {
  downloadClinicProgressPdf,
  printClinicProgressReport,
} from "@/features/reports/lib/export-pdf"
import { downloadClinicProgressExcel } from "@/features/reports/lib/export-excel"
import type { ReportFilters, ReportsBundle } from "@/features/reports/types"
import type { StaffAccess } from "@/lib/auth/types"
import { exportReportTitle } from "@/features/reports/lib/report-scope"
import { designationLabel } from "@/lib/health/roles"
import type { AnnouncementListResult } from "@/types/announcement"
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

const STATUS_OPTIONS = ["Waiting", "Ongoing", "Completed"]

export function ReportsAnalyticsPage({
  access,
  initialBundle,
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
    (access.designation === "admin" || access.designation === "nurse") &&
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
        No data available for the selected period.
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
}) {
  const d = access.designation
  const [filters, setFilters] = useState<ReportFilters>(initialBundle.filters)
  const [bundleSource, setBundleSource] = useState(initialBundle)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(initialBundle.error ?? null)

  // Debounced lightly — reports don't need sub-second freshness.
  useStaffRealtimeRefresh(
    `staff-reports-${d}`,
    STAFF_REALTIME_TABLES.reports,
    () => {
      startTransition(async () => {
        const result = await fetchReportsBundleAction(d, filters)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setError(null)
        setBundleSource(result.data)
        setFilters(result.data.filters)
      })
    },
    2500
  )

  useEffect(() => {
    setBundleSource(initialBundle)
    setFilters(initialBundle.filters)
    setError(initialBundle.error ?? null)
  }, [initialBundle])

  useEffect(() => {
    if (error) {
      appToast.error({
        title: "Unable to Load Report",
        description: error,
      })
    }
  }, [error])

  const bundle = useMemo(
    () =>
      applyReportsFilters(
        d,
        filters,
        bundleSource.live,
        bundleSource.dataset
      ),
    [d, filters, bundleSource.live, bundleSource.dataset]
  )

  const exportPack = useMemo(() => {
    const narrative = buildClinicProgressNarrative({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      roleLabel: designationLabel(d),
      kpis: bundle.kpis,
      charts: bundle.charts,
      scope: d === "dentist" ? "dental" : "medical",
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

  const empty =
    exportPack.kpis.every(
      (kpi) => kpi.value === "0" || kpi.value === "0 min" || kpi.value === "—"
    ) &&
    exportPack.charts.every((chart) =>
      chart.points.every(
        (point) =>
          point.value === 0 && !(point.secondary ?? 0) && !(point.tertiary ?? 0)
      )
    )

  function reloadForPeriod(next: Partial<ReportFilters>) {
    startTransition(async () => {
      const merged = { ...filters, ...next }
      setFilters(merged)
      const periodChanged =
        next.dateFrom != null ||
        next.dateTo != null ||
        next.reportPeriod != null
      if (!periodChanged) return

      const result = await fetchReportsBundleAction(d, merged)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      setBundleSource(result.data)
      setFilters(result.data.filters)
    })
  }

  function updateFilters(next: Partial<ReportFilters>) {
    const periodChanged =
      next.dateFrom != null ||
      next.dateTo != null ||
      next.reportPeriod != null
    if (periodChanged) {
      reloadForPeriod(next)
      return
    }
    startTransition(() => {
      setFilters((prev) => ({ ...prev, ...next }))
    })
  }

  function exportMeta(): ExportMeta {
    return {
      reportTitle: exportReportTitle(d),
      generatedAt: new Date().toISOString(),
      generatedBy: access.fullName,
      roleLabel: designationLabel(d),
      filterSummary: buildFilterSummary(filters),
    }
  }

  return (
    <ReportsDashboardView
      access={access}
      filters={filters}
      pending={pending}
      error={error}
      empty={empty}
      filterSummary={buildFilterSummary(filters)}
      kpis={bundle.kpis}
      charts={bundle.charts}
      tables={bundle.tables}
      statusOptions={STATUS_OPTIONS}
      shellClassName="pt-2"
      onPeriodChange={(next) => {
        reloadForPeriod(next)
      }}
      onApplyCustom={(next) => reloadForPeriod(next)}
      onClearFilters={() => {
        reloadForPeriod(defaultFiltersFor(d))
      }}
      onSecondaryChange={updateFilters}
      onPrint={() => {
        try {
          printClinicProgressReport({ meta: exportMeta(), pack: exportPack })
        } catch (error) {
          appToast.error({
            title: "Print failed",
            description:
              error instanceof Error
                ? error.message
                : "Could not open print view.",
          })
        }
      }}
      onExportPdf={() => {
        void downloadClinicProgressPdf({
          meta: exportMeta(),
          pack: exportPack,
          reportMode: d === "dentist" ? "dental" : "medical",
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
                error instanceof Error
                  ? error.message
                  : "Could not export PDF.",
            })
          })
      }}
      onExportExcel={() => {
        void downloadClinicProgressExcel({
          meta: exportMeta(),
          pack: exportPack,
        })
          .then(() =>
            appToast.success({
              title: "Excel downloaded.",
              description: "Your report export has been saved.",
            })
          )
          .catch((error) => {
            appToast.error({
              title: "Export failed",
              description:
                error instanceof Error
                  ? error.message
                  : "Could not export Excel.",
            })
          })
      }}
    />
  )
}
