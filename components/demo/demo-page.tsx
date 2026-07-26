"use client"

import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/shared/stat-card"
import type { DemoStat } from "@/lib/demo/types"
import { designationLabel } from "@/lib/health/roles"
import type { ClinicDesignation } from "@/lib/auth/types"

export function DemoBanner() {
  return (
    <Badge variant="outline" className="w-fit">
      Demo data · not saved to the database
    </Badge>
  )
}

export function DemoPageHeader({
  title,
  description,
  designation,
  actions,
}: {
  title: string
  description: string
  designation: ClinicDesignation
  actions?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <DemoBanner />
        <div className="space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description} · {designationLabel(designation)}
          </p>
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export function DemoStatGrid({ stats }: { stats: DemoStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.key}
          label={stat.label}
          value={stat.value}
          description={stat.description}
        />
      ))}
    </div>
  )
}

export function demoToast(action: string) {
  return `${action} (demo only — not persisted)`
}
