"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { appToast } from "@/lib/feedback/app-toast"

import { AdminReportsView } from "@/features/reports/components/admin-reports-view"
import { ReportsDashboardView } from "@/features/reports/components/reports-dashboard-view"
import type { AdminReportsAggregates } from "@/features/admin/types/ops"
import { applyReportsFilters } from "@/features/reports/data/apply-filters"
import { defaultFiltersFor } from "@/features/reports/data/apply-filters"
import { buildClinicProgressNarrative } from "@/features/reports/lib/clinic-progress-narrative"
import {
  buildFilterSummary,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import {
  downloadClinicProgressPdf,
  printClinicProgressReport,
} from "@/features/reports/lib/export-pdf"
import type { ReportFilters, ReportsBundle } from "@/features/reports/types"
import type { StaffAccess } from "@/lib/auth/types"
import { designationLabel } from "@/lib/health/roles"
import type { AnnouncementListResult } from "@/types/announcement"
import { useStaffRealtimeRouterRefresh } from "@/hooks/use-staff-realtime-refresh"
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
  const [pending, startTransition] = useTransition()

  useStaffRealtimeRouterRefresh(
    `staff-reports-${d}`,
    STAFF_REALTIME_TABLES.reports
  )

  useEffect(() => {
    if (initialBundle.error) {
      appToast.error({
        title: "Unable to Load Report",
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

  return (
    <ReportsDashboardView
      access={access}
      filters={filters}
      pending={pending}
      error={initialBundle.error ?? null}
      empty={empty}
      filterSummary={buildFilterSummary(filters)}
      kpis={bundle.kpis}
      charts={bundle.charts}
      tables={bundle.tables}
      statusOptions={STATUS_OPTIONS}
      shellClassName="pt-2"
      onPeriodChange={(next) => {
        if (next.reportPeriod === "custom") {
          updateFilters(next)
          return
        }
        updateFilters(next)
      }}
      onApplyCustom={(next) => updateFilters(next)}
      onClearFilters={() => {
        startTransition(() => {
          setFilters(defaultFiltersFor(d))
        })
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
    />
  )
}
