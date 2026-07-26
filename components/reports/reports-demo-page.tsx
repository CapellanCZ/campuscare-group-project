"use client"

import { useState } from "react"
import { toast } from "sonner"

import {
  DemoPageHeader,
  DemoStatGrid,
  demoToast,
} from "@/components/demo/demo-page"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { can, getAccessLevel } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { demoReportRows, demoReportStats } from "@/lib/demo/fixtures"

export function ReportsDemoPage({ access }: { access: StaffAccess }) {
  const d = access.designation
  const [range, setRange] = useState("30d")
  const cardsLevel = getAccessLevel(d, "reports.summary_cards")
  const chartsLevel = getAccessLevel(d, "reports.charts")
  const pdfLevel = getAccessLevel(d, "reports.export_pdf")
  const canExcel = can(d, "reports.export_excel")

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <DemoPageHeader
        title="Reports"
        description="Consultation and certificate analytics"
        designation={d}
        actions={
          <>
            {pdfLevel !== "none" ? (
              <Button
                variant="outline"
                onClick={() =>
                  toast.message(
                    demoToast(
                      pdfLevel === "view"
                        ? "Preview PDF export"
                        : "Export PDF"
                    )
                  )
                }
              >
                Export PDF
              </Button>
            ) : null}
            {canExcel ? (
              <Button
                onClick={() => toast.success(demoToast("Export Excel"))}
              >
                Export Excel
              </Button>
            ) : null}
          </>
        }
      />

      {cardsLevel !== "none" ? (
        <DemoStatGrid stats={demoReportStats} />
      ) : null}

      {can(d, "reports.filters") ? (
        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "90d"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={range === value ? "default" : "outline"}
              onClick={() => setRange(value)}
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
              { label: "Consultations", value: "312", hint: range },
              { label: "Peak day", value: "Thu", hint: "92 visits" },
              { label: "Top station", value: "Physician", hint: "48%" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-muted/20 px-4 py-5"
              >
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {can(d, "reports.consultation") ? (
          <Card className="min-w-0 shadow-none dark:ring-0">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Consultation reports</CardTitle>
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
                  {demoReportRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.consultations}</TableCell>
                      <TableCell>{row.walkIns}</TableCell>
                      <TableCell>{row.avgWaitMinutes} min</TableCell>
                    </TableRow>
                  ))}
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
                  {demoReportRows.map((row) => (
                    <TableRow key={`cert-${row.id}`}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>{row.certificates}</TableCell>
                      <TableCell>{row.topService}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
