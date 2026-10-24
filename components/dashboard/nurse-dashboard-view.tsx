"use client"

import { useMemo, useState, type ComponentType } from "react"
import {
  IconClipboardList,
  IconHeartbeat,
  IconListCheck,
  IconUserHeart,
} from "@tabler/icons-react"

import { NurseRequestsPanel } from "@/components/dashboard/nurse-requests-panel"
import { NurseTodayQueue } from "@/components/dashboard/nurse-today-queue"
import { StaffWelcomeLoader } from "@/components/dashboard/staff-welcome-loader"
import { NurseIntakeSheet } from "@/components/queue/nurse-intake-sheet"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { StatCard } from "@/components/shared/stat-card"
import {
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import { Skeleton } from "@/components/ui/skeleton"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
} from "@/lib/health/types"
import { cn } from "@/lib/utils"

const KPI_ICONS: Record<
  string,
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  intake: IconHeartbeat,
  pending: IconClipboardList,
  waiting: IconListCheck,
  served: IconUserHeart,
}

const PRIORITY_KPI_KEYS = ["intake", "pending", "waiting", "served"] as const

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

function nurseKpiHref(key: string): string | undefined {
  switch (key) {
    case "pending":
      return "/nurse/requests"
    case "intake":
    case "waiting":
      return "/nurse/queue"
    default:
      return undefined
  }
}

export function NurseDashboardView({
  access,
  kpis,
  tickets,
  activity,
  recent: _recent,
  summary,
  dataLoading = false,
  decorative = false,
}: {
  access: StaffAccess
  kpis: DashboardKpis
  tickets: QueueTicketRow[]
  activity: ActivityItem[]
  recent: RecentlyServedItem[]
  stats: QueueStats
  summary: RoleDashboardSummary
  dataLoading?: boolean
  /** Landing / marketing shot — hide interactive sheets & walk-in CTA. */
  decorative?: boolean
}) {
  void _recent
  const [intakeTicket, setIntakeTicket] = useState<QueueTicketRow | null>(null)

  const kpiCards = useMemo(() => {
    const byKey = new Map(kpis.cards.map((card) => [card.key, card]))
    return PRIORITY_KPI_KEYS.map((key) => byKey.get(key)).filter(
      (card): card is NonNullable<typeof card> => Boolean(card)
    )
  }, [kpis.cards])

  return (
    <div className="flex flex-1 flex-col gap-6 sm:gap-8 lg:gap-10">
      {!decorative ? (
        <StaffWelcomeLoader
          open={dataLoading}
          staffName={access.fullName}
          role="nurse"
        />
      ) : null}
      <div className="flex flex-col gap-3">
        <SectionLabel>At a glance</SectionLabel>
        <PanelFrame>
          <PanelGrid className="grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = KPI_ICONS[card.key]
              return (
                <PanelCell key={String(card.key)}>
                  <StatCard
                    flush
                    compact
                    label={card.label}
                    value={String(card.value)}
                    description={card.description}
                    delta={card.delta}
                    lowerIsBetter={card.lowerIsBetter}
                    icon={Icon ? <Icon /> : undefined}
                    href={nurseKpiHref(card.key)}
                    loading={dataLoading}
                  />
                </PanelCell>
              )
            })}
          </PanelGrid>
        </PanelFrame>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>Today&apos;s queue</SectionLabel>
        <PanelFrame>
          <PanelGrid>
            <PanelCell className="min-w-0">
              <NurseTodayQueue
                access={access}
                tickets={tickets}
                onStartIntake={setIntakeTicket}
                dataLoading={dataLoading}
                enableWalkIn={!decorative}
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>Triage &amp; follow-up</SectionLabel>
        <PanelFrame>
          <PanelGrid className="lg:grid-cols-2">
            <PanelCell className="lg:col-span-2">
              {dataLoading ? (
                <div className={cn(panelCardClassName, "space-y-3 p-6")}>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : (
                <NurseRequestsPanel
                  access={access}
                  summary={summary}
                  decorative={decorative}
                />
              )}
            </PanelCell>
            <PanelCell className="lg:col-span-2">
              {dataLoading ? (
                <div className={cn(panelCardClassName, "space-y-3 p-6")}>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : (
                <ActivityFeed
                  className={panelCardClassName}
                  items={activity.slice(0, 6)}
                  title="Recent activity"
                />
              )}
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>

      {!decorative ? (
        <NurseIntakeSheet
          ticket={intakeTicket}
          open={Boolean(intakeTicket)}
          onOpenChange={(open) => {
            if (!open) setIntakeTicket(null)
          }}
        />
      ) : null}
    </div>
  )
}
