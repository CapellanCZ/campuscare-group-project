"use client"

import { useEffect, useState, type ComponentProps } from "react"

import { fetchTeamDutyOverviewAction } from "@/features/availability/actions/availability"
import { dutyStatusLabel } from "@/lib/availability/types"
import type { DutyStatusValue } from "@/lib/availability/types"
import { cn } from "@/lib/utils"
import { StatusIndicator } from "@/components/indicator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type DutyOverviewRow = {
  role: "nurse" | "physician" | "dentist"
  label: string
  status: DutyStatusValue
}

function statusColor(status: DutyStatusValue): "emerald" | "amber" | "sky" {
  if (status === "available") return "emerald"
  if (status === "on_break") return "amber"
  return "sky"
}

export function TeamOnDuty({
  className,
  ...props
}: ComponentProps<typeof Card>) {
  const [rows, setRows] = useState<DutyOverviewRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchTeamDutyOverviewAction().then((result) => {
      if (cancelled) return
      if (result.ok) setRows(result.data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className={cn("shadow-none dark:ring-0", className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>Staff availability</CardTitle>
        <CardDescription>Clinical duty status by station</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.role}
                className="flex items-center justify-between gap-3 p-4"
              >
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <StatusIndicator
                    color={statusColor(row.status)}
                    pulse={row.status === "available"}
                  />
                  {dutyStatusLabel(row.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
