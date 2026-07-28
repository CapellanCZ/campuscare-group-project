"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { DemoPageHeader, DemoStatGrid } from "@/components/demo/demo-page"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchClinicReportAction } from "@/features/reports/actions"
import {
  formatSharePercent,
  reportRangeLabel,
} from "@/features/reports/lib/format"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { DemoStat } from "@/lib/demo/types"
import {
  REPORT_RANGES,
  type ClinicReportBundle,
  type ReportRange,
} from "@/types/report"

function toStatCards(
  report: ClinicReportBundle
): DemoStat[] {
  return [
    {
      key: "consults",
      label: `Consultations (${report.range})`,
      value: String(report.stats.consultations),
      description: "All stations",
    },
    {
      key: "certs",
      label: `Certificates (${report.range})`,
      value: String(report.stats.certificates),
      description: "Issued / printed",
    },
    {
      key: "wait",
      label: "Avg wait",
      value: `${report.stats.avgWaitMinutes} min`,
      description: "Queue estimates",
    },
    {
      key: "walkins",
      label: `Walk-ins (${report.range})`,
      value: String(report.stats.walkIns),
      description: "Registered walk-ins",
    },
  ]
}

function ReportsSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  )
}

async function downloadExcel(report: ClinicReportBundle) {
  const XLSX = await import("xlsx")
  const rows = report.periodRows.map((row) => ({
    Period: row.period,
    Consultations: row.consultations,
    Certificates: row.certificates,
    "Walk-ins": row.walkIns,
    "Avg wait (min)": row.avgWaitMinutes,
    "Top service": row.topService,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reports")
  XLSX.writeFile(
    workbook,
    `campuscare-reports-${report.range}-${report.startIso.slice(0, 10)}.xlsx`
  )
}

export function ReportsPage({
  access,
  initialReport,
  initialError,
}: {
  access: StaffAccess
  initialReport: ClinicReportBundle
  initialError?: string | null
}) {
  const d = access.designation
  const [range, setRange] = useState<ReportRange>(initialReport.range)
  const [report, setReport] = useState(initialReport)
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()

  const cardsLevel = getAccessLevel(d, "reports.summary_cards")
  const chartsLevel = getAccessLevel(d, "reports.charts")
  const pdfLevel = getAccessLevel(d, "reports.export_pdf")
  const canExcel = can(d, "reports.export_excel")

  useEffect(() => {
    if (initialError) toast.error(initialError)
  }, [initialError])

  const loadRange = useCallback(async (nextRange: ReportRange) => {
    setLoading(true)
    try {
      const result = await fetchClinicReportAction(nextRange)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setReport(result.data)
      setRange(result.data.range)
    } catch {
      toast.error(
        "Unable to reach the database. Check your connection and try again."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  function handleRangeChange(nextRange: ReportRange) {
    if (nextRange === range) return
    startTransition(() => {
      void loadRange(nextRange)
    })
  }

  function handleExportPdf() {
    window.print()
    toast.success(
      pdfLevel === "view" ? "Opening print preview." : "Preparing PDF export."
    )
  }

  function handleExportExcel() {
    startTransition(async () => {
      try {
        await downloadExcel(report)
        toast.success("Excel export downloaded.")
      } catch {
        toast.error("Could not export Excel. Please try again.")
      }
    })
  }

  const statCards = useMemo(() => toStatCards(report), [report])
  const showSkeleton = loading || pending

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 print:p-0">
      <div className="print:hidden">
        <DemoPageHeader
          title="Reports"
          description="Consultation and certificate analytics"
          designation={d}
          showDemoBanner={false}
          actions={
            <>
              {pdfLevel !== "none" ? (
                <Button variant="outline" onClick={handleExportPdf}>
                  Export PDF
                </Button>
              ) : null}
              {canExcel ? (
                <Button onClick={handleExportExcel} disabled={pending}>
                  Export Excel
                </Button>
              ) : null}
            </>
          }
        />
      </div>

      <div className="hidden print:block print:mb-4">
        <h1 className="text-2xl font-semibold">CampusCare Reports</h1>
        <p className="text-sm text-muted-foreground">
          {reportRangeLabel(report.range)} · generated{" "}
          {new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
        </p>
      </div>

      {showSkeleton ? (
        <div className="print:hidden">
          <ReportsSkeleton />
        </div>
      ) : (
        <>
          {cardsLevel !== "none" ? <DemoStatGrid stats={statCards} /> : null}

          {can(d, "reports.filters") ? (
            <div className="flex flex-wrap gap-2 print:hidden">
              {REPORT_RANGES.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={range === value ? "default" : "outline"}
                  onClick={() => handleRangeChange(value)}
                >
                  Last {value}
                </Button>
              ))}
            </div>
          ) : null}

          {chartsLevel !== "none" ? (
            <Card className="min-w-0 shadow-none dark:ring-0">
              <CardHeader className="border-b">
                <CardTitle className="text-base">
                  Charts & analytics
                  {chartsLevel === "view" ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (view)
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 py-6 sm:grid-cols-3">
                {[
                  {
                    label: "Consultations",
                    value: String(report.stats.consultations),
                    hint: report.rangeLabel,
                  },
                  {
                    label: "Peak day",
                    value: report.analytics.peakDayLabel,
                    hint:
                      report.analytics.peakDayCount > 0
                        ? `${report.analytics.peakDayCount} visits`
                        : "No visits yet",
                  },
                  {
                    label: "Top station",
                    value: report.analytics.topStationLabel,
                    hint: formatSharePercent(report.analytics.topStationShare),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border bg-muted/20 px-4 py-5"
                  >
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.hint}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {can(d, "reports.consultation") ? (
              <Card className="min-w-0 shadow-none dark:ring-0">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">
                    Consultation reports
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Consults</TableHead>
                        <TableHead>Walk-ins</TableHead>
                        <TableHead>Avg wait</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.periodRows.length ? (
                        report.periodRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{row.consultations}</TableCell>
                            <TableCell>{row.walkIns}</TableCell>
                            <TableCell>{row.avgWaitMinutes} min</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-8 text-center text-muted-foreground"
                          >
                            No consultation activity in this range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            {can(d, "reports.certificate") ? (
              <Card className="min-w-0 shadow-none dark:ring-0">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">
                    Certificate reports
                    {getAccessLevel(d, "reports.certificate") === "view" ? (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        (view)
                      </span>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Certificates</TableHead>
                        <TableHead>Top service</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.periodRows.length ? (
                        report.periodRows.map((row) => (
                          <TableRow key={`cert-${row.id}`}>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{row.certificates}</TableCell>
                            <TableCell>{row.topService}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-8 text-center text-muted-foreground"
                          >
                            No certificate activity in this range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

/** @deprecated Prefer ReportsPage */
export const ReportsDemoPage = ReportsPage
