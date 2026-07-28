"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  value: { label: "Value", color: "#1e3a8a" },
  secondary: { label: "Secondary", color: "#0ea5e9" },
} satisfies ChartConfig

export function ReportChartCard({ series }: { series: ReportChartSeries }) {
  const data = series.points.map((p) => ({
    label: p.label,
    value: p.value,
    secondary: p.secondary ?? 0,
  }))

  return (
    <Card className={cn(panelCardClassName)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{series.title}</CardTitle>
        {series.description ? (
          <CardDescription>{series.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No chart data for the selected filters.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-[16/9] w-full">
            {series.kind === "pie" ? (
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={40}
                  outerRadius={80}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.label}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            ) : series.kind === "bar" ? (
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
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
