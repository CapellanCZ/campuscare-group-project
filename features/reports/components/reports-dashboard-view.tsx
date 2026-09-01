"use client"

import type { ReactNode } from "react"
import {
  IconCertificate,
  IconCircleCheck,
  IconClock,
  IconDental,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconHeartbeat,
  IconPrinter,
  IconStethoscope,
  IconCalendarEvent,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react"

import { ReportAnalyticsCard } from "@/features/reports/components/report-analytics-card"
import { ReportPeriodFilter } from "@/features/reports/components/report-period-filter"
import { dashboardSlotsFor, reportsPageDescription } from "@/features/reports/lib/dashboard-layout"
import { formatAppliedPeriod } from "@/features/reports/lib/report-period"
import type {
  ReportChartSeries,
  ReportFilters,
  ReportKpi,
  ReportKpiKey,
  ReportTableBundle,
} from "@/features/reports/types"
import { PageIntro } from "@/components/layout/panel-frame"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { catalogFor } from "@/features/reports/role-catalog"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

const KPI_ICONS: Partial<Record<ReportKpiKey, ReactNode>> = {
  patients_served: <IconUsers />,
  total_consultations: <IconStethoscope />,
  medical_consultations: <IconHeartbeat />,
  dental_consultations: <IconDental />,
  certs_issued: <IconCertificate />,
  avg_wait: <IconClock />,
  patients_treated: <IconUserCheck />,
  completed_consultations: <IconCircleCheck />,
  follow_up_cases: <IconCalendarEvent />,
}

type PeriodChange = Pick<ReportFilters, "reportPeriod" | "dateFrom" | "dateTo">

export function ReportsDashboardView({
  access,
  filters,
  pending,
  error,
  empty,
  filterSummary,
  kpis,
  charts,
  tables,
  statusOptions,
  cardClassName,
  shellClassName,
  elevatedCards,
  onPeriodChange,
  onApplyCustom,
  onClearFilters,
  onSecondaryChange,
  onPrint,
  onExportPdf,
  onExportExcel,
}: {
  access: StaffAccess
  filters: ReportFilters
  pending: boolean
  error: string | null
  empty: boolean
  filterSummary: string
  kpis: ReportKpi[]
  charts: ReportChartSeries[]
  tables: ReportTableBundle[]
  statusOptions: string[]
  cardClassName?: string
  shellClassName?: string
  elevatedCards?: boolean
  onPeriodChange: (next: PeriodChange) => void
  onApplyCustom: (next: PeriodChange) => void
  onClearFilters: () => void
  onSecondaryChange: (patch: Partial<ReportFilters>) => void
  onPrint: () => void
  onExportPdf: () => void
  onExportExcel?: () => void
}) {
  const d = access.designation
  const catalog = catalogFor(d)
  const slots = dashboardSlotsFor(d)
  const chartsLevel = getAccessLevel(d, "reports.charts")
  const cardsLevel = getAccessLevel(d, "reports.summary_cards")
  const pdfLevel = getAccessLevel(d, "reports.export_pdf")
  const excelLevel = getAccessLevel(d, "reports.export_excel")
  const canFilters = can(d, "reports.filters")
  const showConsultationType = !catalog.lockConsultationType
  const periodLabel = formatAppliedPeriod(
    filters.reportPeriod,
    filters.dateFrom,
    filters.dateTo
  )

  const chartByKey = new Map(charts.map((chart) => [chart.key, chart]))
  const tableByKind = new Map(tables.map((table) => [table.kind, table]))

  const primary = slots.filter((slot) => slot.placement === "primary")
  const secondary = slots.filter((slot) => slot.placement === "secondary")
  const full = slots.filter((slot) => slot.placement === "full")

  return (
    <div className={cn("flex flex-1 flex-col gap-6", shellClassName)}>
      <PageIntro
        title="Reports & Analytics"
        description={reportsPageDescription(d, periodLabel)}
        action={
          <div className="flex flex-wrap gap-2">
            {pdfLevel !== "none" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={empty || pending}
                onClick={onExportPdf}
              >
                <IconFileTypePdf className="size-4" aria-hidden />
                Export PDF
              </Button>
            ) : null}
            {excelLevel !== "none" && onExportExcel ? (
              <Button
                size="sm"
                variant="outline"
                disabled={empty || pending}
                onClick={onExportExcel}
              >
                <IconFileSpreadsheet className="size-4" aria-hidden />
                Export Excel
              </Button>
            ) : null}
            {pdfLevel !== "none" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={empty || pending}
                onClick={onPrint}
              >
                <IconPrinter className="size-4" aria-hidden />
                Print
              </Button>
            ) : null}
          </div>
        }
      />

      {canFilters ? (
        <Card className={cn(cardClassName, "shadow-none")}>
          <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
            <ReportPeriodFilter
              filters={filters}
              pending={pending}
              onChange={onPeriodChange}
              onApplyCustom={onApplyCustom}
            />
            <div
              className={cn(
                "grid grid-cols-1 gap-3",
                showConsultationType ? "sm:grid-cols-3" : "sm:grid-cols-2"
              )}
            >
              <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
                Patient Type
                <select
                  className={selectClass}
                  value={filters.patientType}
                  disabled={pending}
                  onChange={(event) =>
                    onSecondaryChange({
                      patientType: event.target
                        .value as ReportFilters["patientType"],
                    })
                  }
                >
                  <option value="all">All</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="employee">Employee</option>
                </select>
              </label>
              {showConsultationType ? (
                <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
                  Consultation Type
                  <select
                    className={selectClass}
                    value={filters.consultationType}
                    disabled={pending}
                    onChange={(event) =>
                      onSecondaryChange({
                        consultationType: event.target
                          .value as ReportFilters["consultationType"],
                      })
                    }
                  >
                    <option value="all">All</option>
                    <option value="medical">Medical</option>
                    <option value="dental">Dental</option>
                  </select>
                </label>
              ) : null}
              <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
                Status
                <select
                  className={selectClass}
                  value={filters.status}
                  disabled={pending}
                  onChange={(event) =>
                    onSecondaryChange({ status: event.target.value })
                  }
                >
                  <option value="all">All</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">{filterSummary}</p>
              {filters.reportPeriod === "custom" ? null : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={onClearFilters}
                >
                  Clear Filter
                </Button>
              )}
            </div>
            {pending ? (
              <p className="text-xs text-muted-foreground">Updating…</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          Unable to Load Report. We couldn&apos;t load the report data. Please try
          again.
        </p>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">
          No data available for the selected period.
        </p>
      ) : null}

      {pending && empty ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : null}

      {cardsLevel !== "none" ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.key}
              className={cardClassName}
              label={kpi.label}
              value={kpi.value}
              description={kpi.description}
              icon={KPI_ICONS[kpi.key]}
            />
          ))}
        </div>
      ) : null}

      {chartsLevel !== "none" ? (
        <div className="flex flex-col gap-6">
          {primary.map((slot) => {
            const series = chartByKey.get(slot.chartKey)
            if (!series) return null
            return (
              <ReportAnalyticsCard
                key={slot.chartKey}
                series={series}
                table={slot.tableKind ? tableByKind.get(slot.tableKind) : null}
                title={slot.title}
                elevated={elevatedCards}
                tall
              />
            )
          })}

          {secondary.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {secondary.map((slot) => {
                const series = chartByKey.get(slot.chartKey)
                if (!series) return null
                return (
                  <ReportAnalyticsCard
                    key={slot.chartKey}
                    series={series}
                    table={
                      slot.tableKind ? tableByKind.get(slot.tableKind) : null
                    }
                    title={slot.title}
                    elevated={elevatedCards}
                  />
                )
              })}
            </div>
          ) : null}

          {full.map((slot) => {
            const series = chartByKey.get(slot.chartKey)
            if (!series) return null
            return (
              <ReportAnalyticsCard
                key={slot.chartKey}
                series={series}
                table={slot.tableKind ? tableByKind.get(slot.tableKind) : null}
                title={slot.title}
                elevated={elevatedCards}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
