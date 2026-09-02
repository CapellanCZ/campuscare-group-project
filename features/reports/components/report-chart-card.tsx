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
import type { ReportChartKind, ReportChartSeries } from "@/features/reports/types"
import { cn } from "@/lib/utils"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#64748b",
]

const trendConfig = {
  value: { label: "Medical", color: "var(--chart-1)" },
  secondary: { label: "Dental", color: "var(--chart-2)" },
  tertiary: { label: "Total", color: "var(--chart-4)" },
} satisfies ChartConfig

const stackedConfig = {
  value: { label: "Student", color: "var(--chart-1)" },
  secondary: { label: "Faculty", color: "var(--chart-2)" },
  tertiary: { label: "Employee", color: "var(--chart-3)" },
} satisfies ChartConfig

export type OpsChartSeries = {
  key: string
  title: string
  description?: string
  kind: ReportChartKind
  points: Array<{
    label: string
    value: number
    secondary?: number
    tertiary?: number
  }>
  valueLabel?: string
  secondaryLabel?: string
  tertiaryLabel?: string
}

export function ReportChartCard({
  series,
  elevated = false,
  embedded = false,
  tall = false,
}: {
  series: ReportChartSeries | OpsChartSeries
  elevated?: boolean
  embedded?: boolean
  tall?: boolean
}) {
  const data = series.points.map((p) => ({
    label: p.label,
    value: p.value,
    secondary: p.secondary ?? 0,
    tertiary: p.tertiary ?? 0,
  }))
  const kind = series.kind
  const valueLabel =
    "valueLabel" in series && series.valueLabel ? series.valueLabel : "Medical"
  const secondaryLabel =
    "secondaryLabel" in series && series.secondaryLabel
      ? series.secondaryLabel
      : "Dental"
  const tertiaryLabel =
    "tertiaryLabel" in series && series.tertiaryLabel
      ? series.tertiaryLabel
      : "Total"
  const showSecondary =
    kind === "multiline" ||
    kind === "stackedBar" ||
    (kind === "line" && series.points.some((p) => (p.secondary ?? 0) > 0))
  const showTertiary =
    kind === "multiline" ||
    kind === "stackedBar" ||
    series.points.some((p) => (p.tertiary ?? 0) > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  const empty = data.length === 0 || data.every(
    (d) => d.value === 0 && d.secondary === 0 && d.tertiary === 0
  )
  const config = kind === "stackedBar" ? stackedConfig : trendConfig

  const chart = empty ? (
    <p className="py-10 text-center text-sm text-muted-foreground">
      No data available for the selected period.
    </p>
  ) : (
    <>
      <ChartContainer
        config={config}
        className={cn(
          "aspect-[16/9] w-full",
          tall ? "min-h-[280px]" : "min-h-[220px]"
        )}
      >
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
        ) : kind === "stackedBar" ? (
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar
              dataKey="value"
              name="Student"
              stackId="a"
              fill="var(--color-value)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="secondary"
              name="Faculty"
              stackId="a"
              fill="var(--color-secondary)"
            />
            <Bar
              dataKey="tertiary"
              name="Employee"
              stackId="a"
              fill="var(--color-tertiary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        ) : kind === "hbar" ? (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={132}
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
              name={valueLabel}
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={false}
            />
            {showSecondary ? (
              <Line
                type="monotone"
                dataKey="secondary"
                name={secondaryLabel}
                stroke="var(--color-secondary)"
                strokeWidth={2}
                dot={false}
              />
            ) : null}
            {showTertiary ? (
              <Line
                type="monotone"
                dataKey="tertiary"
                name={tertiaryLabel}
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
  )

  if (embedded) return chart

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
      <CardContent>{chart}</CardContent>
    </Card>
  )
}
