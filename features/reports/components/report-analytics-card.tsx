"use client"

import dynamic from "next/dynamic"

import type { ReportChartSeries } from "@/features/reports/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const ReportChartCard = dynamic(
  () =>
    import("@/features/reports/components/report-chart-card").then(
      (mod) => mod.ReportChartCard
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full rounded-lg" />,
  }
)

/** Medium dashboard chart widget — chart only (tables live in the detail section). */
export function ReportAnalyticsCard({
  series,
  title,
  description,
  elevated = false,
  className,
}: {
  series: ReportChartSeries
  title?: string
  description?: string
  elevated?: boolean
  className?: string
}) {
  return (
    <Card
      className={cn(
        "flex h-full min-w-0 flex-col",
        elevated
          ? "rounded-xl border border-border bg-card shadow-sm dark:border-border dark:bg-card"
          : "border-border/70 bg-card shadow-none dark:border-border dark:bg-card",
        className
      )}
    >
      <CardHeader className="gap-1 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight sm:text-base">
          {title ?? series.title}
        </CardTitle>
        {description || series.description ? (
          <CardDescription className="line-clamp-2 text-xs sm:text-sm">
            {description ?? series.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        <ReportChartCard series={series} embedded />
      </CardContent>
    </Card>
  )
}
