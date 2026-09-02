"use client"

import { ReportChartCard } from "@/features/reports/components/report-chart-card"
import { ReportDataTable } from "@/features/reports/components/report-data-table"
import type {
  ReportChartSeries,
  ReportTableBundle,
} from "@/features/reports/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ReportAnalyticsCard({
  series,
  table,
  title,
  description,
  elevated = false,
  tall = false,
  className,
}: {
  series: ReportChartSeries
  table?: ReportTableBundle | null
  title?: string
  description?: string
  elevated?: boolean
  tall?: boolean
  className?: string
}) {
  return (
    <Card
      className={cn(
        elevated
          ? "rounded-xl border border-border bg-card shadow-sm dark:border-border dark:bg-card"
          : "min-w-0 border-border/70 bg-card shadow-none dark:border-border dark:bg-card",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title ?? series.title}</CardTitle>
        {description || series.description ? (
          <CardDescription>{description ?? series.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ReportChartCard series={series} embedded tall={tall} />
        {table ? (
          <ReportDataTable
            table={table}
            query=""
            onQueryChange={() => undefined}
            hideTitle
            independentSearch
            compact
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
