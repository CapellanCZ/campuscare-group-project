"use client"

import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/shared/stat-card"
import {
  PageIntro,
  PanelCell,
  PanelFrame,
  PanelGrid,
} from "@/components/layout/panel-frame"
import type { DemoStat } from "@/lib/demo/types"
import { designationLabel } from "@/lib/health/roles"
import type { ClinicDesignation } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

export function DemoBanner() {
  return null
}

export function DemoPageHeader({
  title,
  description,
  designation,
  actions,
  showDemoBanner = false,
  showRoleSuffix = true,
}: {
  title: string
  description: string
  designation: ClinicDesignation
  actions?: React.ReactNode
  showDemoBanner?: boolean
  showRoleSuffix?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {showDemoBanner ? (
        <Badge variant="outline" className="w-fit">
          Preview layout
        </Badge>
      ) : null}
      <PageIntro
        title={title}
        description={
          showRoleSuffix
            ? `${description} · ${designationLabel(designation)}`
            : description
        }
        action={actions}
      />
    </div>
  )
}

export function DemoStatGrid({
  stats,
  className,
}: {
  stats: DemoStat[]
  className?: string
}) {
  const count = stats.length
  return (
    <PanelFrame className={className}>
      <PanelGrid
        className={cn(
          "sm:grid-cols-2",
          count >= 3 && "lg:grid-cols-3",
          count >= 4 && "xl:grid-cols-4"
        )}
      >
        {stats.map((stat) => (
          <PanelCell key={stat.key}>
            <StatCard
              flush
              label={stat.label}
              value={stat.value}
              description={stat.description}
            />
          </PanelCell>
        ))}
      </PanelGrid>
    </PanelFrame>
  )
}
