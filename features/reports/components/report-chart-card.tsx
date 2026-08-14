"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { panelCardClassName } from "@/components/layout/panel-frame"
import type { ReportChartSeries } from "@/features/reports/types"
import { cn } from "@/lib/utils"

const COLORS = ["#1e3a8a", "#2563eb", "#0ea5e9", "#64748b", "#94a3b8", "#334155"]

const chartConfig = {
  value: { label: "Medical", color: "#1e3a8a" },
  secondary: { label: "Dental", color: "#0ea5e9" },
  tertiary: { label: "Total", color: "#64748b" },
} satisfies ChartConfig

export type OpsChartSeries = {
  key: string
  title: string
  description?: string
  kind: "line" | "bar" | "pie" | "hbar" | "multiline"
  points: Array<{
    label: string
    value: number
    secondary?: number
    tertiary?: number
  }>
}

export function ReportChartCard({
  series,
  elevated = false,
}: {
  series: ReportChartSeries | OpsChartSeries
  elevated?: boolean
}) {
  const data = series.points.map((p) => ({
    label: p.label,
    value: p.value,
    secondary: p.secondary ?? 0,
    tertiary: "tertiary" in p ? (p.tertiary ?? 0) : 0,
  }))
  const kind = series.kind
  const showSecondary =
    kind === "multiline" ||
    (kind === "line" && series.points.some((p) => (p.secondary ?? 0) > 0))
  const showTertiary =
    kind === "multiline" &&
    series.points.some((p) => ("tertiary" in p ? (p.tertiary ?? 0) : 0) > 0)
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card
      className={cn(
        elevated
          ? "rounded-xl border bg-card shadow-sm dark:ring-0"
          : panelCardClassName
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{series.title}</CardTitle>
        {series.description ? (
          <CardDescription>{series.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {data.length === 0 || data.every((d) => d.value === 0 && d.secondary === 0) ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No chart data for the selected filters.
          </p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="aspect-[16/9] w-full min-h-[220px]">
              {kind === "pie" ? (
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              ) : kind === "hbar" ? (
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    width={88}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </BarChart>
              ) : kind === "bar" ? (
                <BarChart data={data} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {showSecondary || showTertiary ? <Legend /> : null}
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Medical"
                    stroke="var(--color-value)"
                    strokeWidth={2}
                    dot={false}
                  />
                  {showSecondary ? (
                    <Line
                      type="monotone"
                      dataKey="secondary"
                      name="Dental"
                      stroke="var(--color-secondary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  ) : null}
                  {showTertiary ? (
                    <Line
                      type="monotone"
                      dataKey="tertiary"
                      name="Total"
                      stroke="var(--color-tertiary)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  ) : null}
                </LineChart>
              )}
            </ChartContainer>
            {kind === "pie" && total > 0 ? (
              <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                {data.map((d, i) => (
                  <li
                    key={d.label}
                    className="flex items-center justify-between gap-2 text-muted-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      {d.label}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {d.value} ({Math.round((d.value / total) * 100)}%)
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
