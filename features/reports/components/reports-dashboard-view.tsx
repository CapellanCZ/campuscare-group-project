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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { catalogFor } from "@/features/reports/role-catalog"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-36 dark:bg-card dark:border-border"

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

/** Equal-width KPI columns — never leave one card stretching alone. */
function kpiGridClass(count: number) {
  if (count <= 1) return "grid-cols-1"
  if (count === 2) return "grid-cols-1 sm:grid-cols-2"
  if (count === 3) return "grid-cols-1 sm:grid-cols-3"
  if (count === 4) return "grid-cols-2 lg:grid-cols-4"
  if (count === 5) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
  return "grid-cols-2 md:grid-cols-3"
}

export function ReportsDashboardView({
  access,
  filters,
  pending,
  error,
  empty,
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
    <div className={cn("flex flex-1 flex-col gap-5", shellClassName)}>
      <PageIntro
        title={reportsPageTitle(d)}
        description={reportsPageDescription(d, periodLabel)}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {scopeLabel ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {scopeLabel} only
              </Badge>
            ) : null}
            {pdfLevel !== "none" ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
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
                className="gap-1.5"
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
                className="gap-1.5"
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

      <PanelFrame>
        {canFilters ? (
          <div className="space-y-3 border-b bg-background px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight">
                  Report filters
                </p>
                <p className="text-xs text-muted-foreground">
                  {periodLabel}
                  {pending ? " · Updating…" : ""}
                </p>
              </div>
              {filters.reportPeriod === "custom" ? null : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  disabled={pending}
                  onClick={onClearFilters}
                >
                  Reset
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <ReportPeriodFilter
                filters={filters}
                pending={pending}
                onChange={onPeriodChange}
                onApplyCustom={onApplyCustom}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <select
                  id="reports-patient-type"
                  className={cn(selectClass, "sm:w-40")}
                  value={filters.patientType}
                  disabled={pending}
                  aria-label="Patient type"
                  onChange={(event) =>
                    onSecondaryChange({
                      patientType: event.target
                        .value as ReportFilters["patientType"],
                    })
                  }
                >
                  <option value="all">All patient types</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="employee">Employee</option>
                </select>
                {showConsultationType ? (
                  <select
                    id="reports-consult-type"
                    className={cn(selectClass, "sm:w-40")}
                    value={filters.consultationType}
                    disabled={pending}
                    aria-label="Consultation type"
                    onChange={(event) =>
                      onSecondaryChange({
                        consultationType: event.target
                          .value as ReportFilters["consultationType"],
                      })
                    }
                  >
                    <option value="all">All consultations</option>
                    <option value="medical">Medical</option>
                    <option value="dental">Dental</option>
                  </select>
                ) : null}
                <select
                  id="reports-status"
                  className={cn(selectClass, "sm:w-36")}
                  value={filters.status}
                  disabled={pending}
                  aria-label="Status"
                  onChange={(event) =>
                    onSecondaryChange({ status: event.target.value })
                  }
                >
                  <option value="all">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="bg-destructive/5 px-4 py-5 sm:px-5">
            <p className="text-sm text-destructive" role="alert">
              Unable to load report data. Please try again or adjust your
              filters.
            </p>
          </div>
        ) : null}

        {!error && empty ? (
          <div className="flex flex-col items-center justify-center gap-2 bg-background px-4 py-14 text-center sm:px-5">
            <p className="text-sm font-medium text-foreground">
              No data for this period
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Try expanding the date range or clearing filters to see clinic
              activity.
            </p>
          </div>
        ) : null}

        {pending && empty ? (
          <PanelGrid className={kpiGridClass(4)}>
            {Array.from({ length: 4 }).map((_, index) => (
              <PanelCell key={index}>
                <Skeleton className="h-24 w-full rounded-none" />
              </PanelCell>
            ))}
          </PanelGrid>
        ) : null}

        {showContent && cardsLevel !== "none" && kpis.length > 0 ? (
          <div className="border-b bg-background">
            <p className="border-b px-4 py-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:px-5">
              Key metrics
            </p>
            <PanelGrid className={kpiGridClass(kpis.length)}>
              {kpis.map((kpi) => (
                <PanelCell key={kpi.key}>
                  <StatCard
                    flush
                    compact
                    className={cn(cardClassName, "h-full")}
                    label={kpi.label}
                    value={kpi.value}
                    description={kpi.description}
                    icon={KPI_ICONS[kpi.key]}
                    accentColor={reportKpiAccentColor(kpi.key)}
                  />
                </PanelCell>
              ))}
            </PanelGrid>
          </div>
        ) : null}

        {showContent && chartsLevel !== "none" && chartSlots.length > 0 ? (
          <div className="space-y-4 bg-background px-4 py-4 sm:px-5 sm:py-5">
            <SectionLabel>Analytics</SectionLabel>
            <ReportAnalyticsCard
              series={chartSlots[0].series}
              title={chartSlots[0].title}
              elevated={elevatedCards}
            />
            {chartSlots.length > 1 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chartSlots.slice(1).map((slot, index, rest) => {
                  const isLastOdd =
                    rest.length % 2 === 1 && index === rest.length - 1
                  return (
                    <ReportAnalyticsCard
                      key={slot.chartKey}
                      series={slot.series}
                      title={slot.title}
                      elevated={elevatedCards}
                      className={cn(isLastOdd && "lg:col-span-2")}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </PanelFrame>

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
