"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { appToast } from "@/lib/feedback/app-toast"

import { reloadAdminReportsAction } from "@/features/admin/actions/reports"
import type { AdminReportsAggregates } from "@/features/admin/types/ops"
import {
  adminElevatedCardClassName,
  adminPageShellClassName,
} from "@/features/admin/lib/admin-surface"
import { ReportsDashboardView } from "@/features/reports/components/reports-dashboard-view"
import { defaultFiltersFor } from "@/features/reports/data/apply-filters"
import { formatPeriodLabel } from "@/features/reports/lib/report-period"
import {
  buildFilterSummary,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import {
  downloadClinicProgressPdf,
  printClinicProgressReport,
} from "@/features/reports/lib/export-pdf"
import type {
  ReportChartSeries,
  ReportFilters,
  ReportKind,
  ReportKpi,
  ReportTableBundle,
} from "@/features/reports/types"
import type { StaffAccess } from "@/lib/auth/types"
import { exportReportTitle } from "@/features/reports/lib/report-scope"
import { designationLabel } from "@/lib/health/roles"
import { useStaffRealtimeRouterRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

function toReportCharts(
  charts: AdminReportsAggregates["charts"]
): ReportChartSeries[] {
  return charts.map((chart) => ({
    key: chart.key as ReportChartSeries["key"],
    title: chart.title,
    description: chart.description,
    kind: chart.kind,
    points: chart.points,
  }))
}

export function HsoSummaryReportsView({
  access,
  initialFilters,
  initialAggregates,
}: {
  access: StaffAccess
  initialFilters: ReportFilters
  initialAggregates: AdminReportsAggregates
}) {
  const d = access.designation
  const isAdmin = d === "admin"
  const [draft, setDraft] = useState(initialFilters)
  const [applied, setApplied] = useState(initialFilters)
  const [aggregates, setAggregates] = useState(initialAggregates)
  const [pending, startTransition] = useTransition()

  useStaffRealtimeRouterRefresh(
    `staff-reports-hso-${d}`,
    STAFF_REALTIME_TABLES.reports
  )

  useEffect(() => {
    if (initialAggregates.error) {
      appToast.error({
        title: "Unable to Load Report",
        description:
          initialAggregates.error ||
          "We couldn't load the report data. Please try again.",
      })
    }
  }, [initialAggregates.error])

  const kpis = useMemo(
    () =>
      aggregates.kpis.map((kpi) => ({
        key: kpi.key as ReportKpi["key"],
        label: kpi.label,
        value: kpi.value,
        description: kpi.description,
      })),
    [aggregates.kpis]
  )

  const charts = toReportCharts(aggregates.charts)
  const tables: ReportTableBundle[] = useMemo(
    () =>
      aggregates.tables.map((table) => ({
        kind: table.kind as ReportKind,
        title: table.title,
        columns: table.columns,
        rows: table.rows,
      })),
    [aggregates.tables]
  )

  const empty =
    kpis.every(
      (kpi) => kpi.value === "0" || kpi.value === "0 min" || kpi.value === "—"
    ) &&
    charts.every((chart) =>
      chart.points.every(
        (point) =>
          point.value === 0 && !(point.secondary ?? 0) && !(point.tertiary ?? 0)
      )
    )

  function reload(nextFilters: ReportFilters) {
    startTransition(async () => {
      const next = await reloadAdminReportsAction({
        dateFrom: nextFilters.dateFrom,
        dateTo: nextFilters.dateTo,
        consultationType: nextFilters.consultationType,
        patientType: nextFilters.patientType,
        status: nextFilters.status,
      })
      setApplied(nextFilters)
      setAggregates(next)
      if (next.error) {
        appToast.error({
          title: "Unable to Load Report",
          description: next.error,
        })
      }
    })
  }

  function applyPeriod(
    next: Pick<ReportFilters, "reportPeriod" | "dateFrom" | "dateTo">
  ) {
    const merged = { ...draft, ...next }
    setDraft(merged)
    if (next.reportPeriod !== "custom") reload(merged)
  }

  function applyCustom(
    next: Pick<ReportFilters, "reportPeriod" | "dateFrom" | "dateTo">
  ) {
    const merged = { ...draft, ...next }
    setDraft(merged)
    reload(merged)
  }

  function applySecondary(patch: Partial<ReportFilters>) {
    const merged = { ...draft, ...patch }
    setDraft(merged)
    reload(merged)
  }

  function clearFilters() {
    const cleared = defaultFiltersFor(d === "nurse" ? "nurse" : "admin")
    setDraft(cleared)
    reload(cleared)
  }

  function exportMeta(): ExportMeta {
    return {
      reportTitle: exportReportTitle(d === "nurse" ? "nurse" : "admin"),
      generatedAt: new Date().toISOString(),
      generatedBy: access.fullName,
      roleLabel: designationLabel(d),
      filterSummary: buildFilterSummary(applied),
    }
  }

  const exportPack = useMemo(() => {
    const findKpi = (key: string) =>
      kpis.find((kpi) => kpi.key === key)?.value ?? "0"
    const periodLabel = formatPeriodLabel(applied.dateFrom, applied.dateTo)
    const cases = charts.find((chart) => chart.key === "health_cases")
    const mix = charts.find((chart) => chart.key === "patient_type_distribution")
    const topCases =
      cases && cases.points.length
        ? cases.points
            .slice(0, 5)
            .map((point) => `${point.label} (${point.value})`)
            .join("; ")
        : "no dominant case pattern recorded"
    const mixLabel =
      mix && mix.points.length
        ? mix.points
            .map((point) => `${point.label} (${point.value})`)
            .join("; ")
        : "no patient mix recorded"
    const narrative = {
      title: "HSO Monthly Summary Report",
      periodLabel,
      executiveSummary: `Aggregated Health Service Office summary for ${periodLabel}. This report contains operational counts only — no patient names or clinical notes.`,
      operationalProgress: `Patients served: ${findKpi("patients_served")}; consultations: ${findKpi("total_consultations")} (Medical ${findKpi("medical_consultations")}, Dental ${findKpi("dental_consultations")}).`,
      healthConcerns: `Leading health cases: ${topCases}.`,
      serviceCapacity:
        d === "nurse"
          ? `Average waiting time: ${findKpi("avg_wait")}. Patient mix: ${mixLabel}.`
          : `Medical certificates issued: ${findKpi("certs_issued")}. Patient mix: ${mixLabel}.`,
      closing:
        "Use this summary for HSO operational review. Individual clinical records remain with Nurses, Physicians, and Dentists.",
    }
    return {
      narrative,
      kpis: kpis as ReportKpi[],
      charts,
      tables,
    }
  }, [applied.dateFrom, applied.dateTo, charts, d, kpis, tables])

  return (
    <ReportsDashboardView
      access={access}
      filters={draft}
      pending={pending}
      error={aggregates.error}
      empty={empty}
      filterSummary={buildFilterSummary(applied)}
      kpis={kpis}
      charts={charts}
      tables={tables}
      statusOptions={aggregates.statusOptions}
      cardClassName={isAdmin ? adminElevatedCardClassName : undefined}
      shellClassName={isAdmin ? adminPageShellClassName() : "pt-2"}
      elevatedCards={isAdmin}
      onPeriodChange={applyPeriod}
      onApplyCustom={applyCustom}
      onClearFilters={clearFilters}
      onSecondaryChange={applySecondary}
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
          reportMode: "hso",
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
      }}
    />
  )
}

export { HsoSummaryReportsView as AdminReportsView }
