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
          showRoleSuffix && description.trim()
            ? `${description} · ${designationLabel(designation)}`
            : description.trim()
              ? description
              : undefined
        }
        action={actions}
      />
    </div>
  )
}

export function DemoStatGrid({
  stats,
  className,
  /** When false, render the hairline grid only — nest inside a parent PanelFrame. */
  framed = true,
  /** `lane` matches nurse queue tiles: icon + label, large number, hint. */
  variant = "card",
}: {
  stats: DemoStat[]
  className?: string
  framed?: boolean
  variant?: "card" | "lane"
}) {
  const count = stats.length
  const grid = (
    <PanelGrid
      className={cn(
        "sm:grid-cols-2",
        count >= 3 && "lg:grid-cols-3",
        count >= 4 && "xl:grid-cols-4",
        !framed && className
      )}
    >
      {stats.map((stat) => {
        if (variant === "lane") {
          return (
            <PanelCell key={stat.key}>
              <div className="flex h-full min-w-0 flex-col gap-2 bg-background px-4 py-3.5">
                <span className="inline-flex min-w-0 items-center gap-2">
                  {stat.icon ? (
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-3.5",
                        stat.iconClassName ?? "bg-muted text-muted-foreground"
                      )}
                      aria-hidden
                    >
                      {stat.icon}
                    </span>
                  ) : null}
                  <span className="truncate text-xs font-medium text-foreground">
                    {stat.label}
                  </span>
                </span>
                <p
                  className={cn(
                    "font-semibold text-2xl tracking-tight tabular-nums",
                    stat.highlight ? "text-primary" : "text-foreground"
                  )}
                >
                  {stat.value}
                </p>
                {stat.description ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {stat.description}
                  </span>
                ) : null}
              </div>
            </PanelCell>
          )
        }

        return (
          <PanelCell key={stat.key}>
            <StatCard
              flush
              label={stat.label}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              iconPlacement={stat.icon ? "start" : "end"}
            />
          </PanelCell>
        )
      })}
    </PanelGrid>
  )
  if (!framed) return grid
  return <PanelFrame className={className}>{grid}</PanelFrame>
}
