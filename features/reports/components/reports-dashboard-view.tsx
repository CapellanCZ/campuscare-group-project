"use client"

import type { ReactNode } from "react"
import {
  IconCertificate,
  IconCircleCheck,
  IconClock,
  IconDental,
  IconFileTypePdf,
  IconFileSpreadsheet,
  IconHeartbeat,
  IconPrinter,
  IconStethoscope,
  IconCalendarEvent,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react"

import { ReportAnalyticsCard } from "@/features/reports/components/report-analytics-card"
import { ReportDataTable } from "@/features/reports/components/report-data-table"
import { ReportPeriodFilter } from "@/features/reports/components/report-period-filter"
import {
  dashboardLayoutFor,
  reportsPageDescription,
} from "@/features/reports/lib/dashboard-layout"
import { formatAppliedPeriod } from "@/features/reports/lib/report-period"
import { reportKpiAccentColor } from "@/features/reports/lib/patient-type-colors"
import {
  reportsPageTitle,
  reportsScopeLabel,
} from "@/features/reports/lib/report-scope"
import type {
  ReportChartSeries,
  ReportFilters,
  ReportKpi,
  ReportKpiKey,
  ReportTableBundle,
} from "@/features/reports/types"
import { PageIntro } from "@/components/layout/panel-frame"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { catalogFor } from "@/features/reports/role-catalog"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-card dark:border-border"

const KPI_ICONS: Partial<Record<ReportKpiKey, ReactNode>> = {
  patients_served: <IconUsers />,
  total_consultations: <IconStethoscope />,
  medical_consultations: <IconHeartbeat />,
  dental_consultations: <IconDental />,
  faculty_medical_consultations: <IconHeartbeat />,
  faculty_dental_consultations: <IconDental />,
  employee_medical_consultations: <IconHeartbeat />,
  employee_dental_consultations: <IconDental />,
  student_medical_consultations: <IconHeartbeat />,
  student_dental_consultations: <IconDental />,
  certs_issued: <IconCertificate />,
  avg_wait: <IconClock />,
  patients_treated: <IconUserCheck />,
  completed_consultations: <IconCircleCheck />,
  follow_up_cases: <IconCalendarEvent />,
}

type PeriodChange = Pick<ReportFilters, "reportPeriod" | "dateFrom" | "dateTo">

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-0.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

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
  const layout = dashboardLayoutFor(d)
  const scopeLabel = reportsScopeLabel(d)
  const chartsLevel = getAccessLevel(d, "reports.charts")
  const cardsLevel = getAccessLevel(d, "reports.summary_cards")
  const pdfLevel = getAccessLevel(d, "reports.export_pdf")
  const canExcel = can(d, "reports.export_excel")
  const canFilters = can(d, "reports.filters")
  const showConsultationType = !catalog.lockConsultationType
  const periodLabel = formatAppliedPeriod(
    filters.reportPeriod,
    filters.dateFrom,
    filters.dateTo
  )

  const chartByKey = new Map(charts.map((chart) => [chart.key, chart]))
  const tableByKind = new Map(tables.map((table) => [table.kind, table]))

  const chartSlots = layout.charts
    .map((slot) => {
      const series = chartByKey.get(slot.chartKey)
      if (!series) return null
      return { ...slot, series }
    })
    .filter(Boolean) as Array<{
    chartKey: (typeof layout.charts)[number]["chartKey"]
    title?: string
    series: ReportChartSeries
  }>

  const tableSlots = layout.tables
    .map((slot) => {
      const table = tableByKind.get(slot.tableKind)
      if (!table || table.rows.length === 0) return null
      return { ...slot, table }
    })
    .filter(Boolean) as Array<{
    tableKind: (typeof layout.tables)[number]["tableKind"]
    title?: string
    table: ReportTableBundle
  }>

  const showContent = !empty && !error

  return (
    <div className={cn("flex flex-1 flex-col gap-6", shellClassName)}>
      <PageIntro
        title={reportsPageTitle(d)}
        description={reportsPageDescription(d, periodLabel)}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {scopeLabel ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {scopeLabel} only
              </Badge>
            ) : null}
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
            {canExcel && onExportExcel ? (
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
        <Card
          className={cn(
            cardClassName,
            "border-border/70 bg-card shadow-none dark:bg-card"
          )}
        >
          <CardHeader className="gap-1 border-b border-border/60 pb-4">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Refine the reporting period and patient criteria.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-6">
            <ReportPeriodFilter
              filters={filters}
              pending={pending}
              onChange={onPeriodChange}
              onApplyCustom={onApplyCustom}
            />
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                showConsultationType ? "sm:grid-cols-3" : "sm:grid-cols-2"
              )}
            >
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
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
                <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
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
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
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
            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2.5 dark:bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {filterSummary}
              </p>
              {filters.reportPeriod === "custom" ? null : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0 self-start sm:self-auto"
                  disabled={pending}
                  onClick={onClearFilters}
                >
                  Reset filters
                </Button>
              )}
            </div>
            {pending ? (
              <p className="text-xs text-muted-foreground">Updating report…</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10">
          <CardContent className="py-6">
            <p className="text-sm text-destructive" role="alert">
              Unable to load report data. Please try again or adjust your
              filters.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!error && empty ? (
        <Card className="border-dashed border-border/70 bg-muted/20 dark:bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              No data for this period
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Try expanding the date range or clearing filters to see clinic
              activity.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {pending && empty ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : null}

      {showContent && cardsLevel !== "none" && kpis.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <SectionLabel>Key metrics</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <StatCard
                key={kpi.key}
                className={cn(cardClassName, "[&_p.text-2xl]:text-xl")}
                label={kpi.label}
                value={kpi.value}
                description={kpi.description}
                icon={KPI_ICONS[kpi.key]}
                accentColor={reportKpiAccentColor(kpi.key)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {showContent && chartsLevel !== "none" && chartSlots.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <SectionLabel>Analytics</SectionLabel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {chartSlots.map((slot) => (
              <ReportAnalyticsCard
                key={slot.chartKey}
                series={slot.series}
                title={slot.title}
                elevated={elevatedCards}
              />
            ))}
          </div>
        </div>
      ) : null}

      {showContent && chartsLevel !== "none" && tableSlots.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <SectionLabel>Detailed data</SectionLabel>
          <div className="flex flex-col gap-4">
            {tableSlots.map((slot) => (
              <Card
                key={slot.tableKind}
                className={cn(
                  elevatedCards
                    ? "rounded-xl border border-border bg-card shadow-sm dark:border-border dark:bg-card"
                    : "border-border/70 bg-card shadow-none dark:border-border dark:bg-card",
                  cardClassName
                )}
              >
                <CardHeader className="gap-1 pb-2">
                  <CardTitle className="text-sm font-semibold tracking-tight sm:text-base">
                    {slot.title ?? slot.table.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ReportDataTable
                    table={slot.table}
                    query=""
                    onQueryChange={() => undefined}
                    hideTitle
                    independentSearch
                    compact
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
