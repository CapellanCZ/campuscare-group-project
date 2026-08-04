"use client"

import Link from "next/link"
import { useMemo, useState, type ComponentType } from "react"
import {
  IconClipboardList,
  IconHeartbeat,
  IconListCheck,
  IconUserHeart,
  IconUserPlus,
} from "@tabler/icons-react"

import { NurseGreetingTitle } from "@/components/dashboard/clinic-datetime"
import { NurseRequestsPanel } from "@/components/dashboard/nurse-requests-panel"
import { NurseTodayQueue } from "@/components/dashboard/nurse-today-queue"
import { NurseIntakeSheet } from "@/components/queue/nurse-intake-sheet"
import { WalkInSheet } from "@/components/queue/walk-in-sheet"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { StatCard } from "@/components/shared/stat-card"
import {
  PageIntro,
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import { Button } from "@/components/ui/button"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import { canRegisterWalkIn } from "@/lib/health/roles"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
} from "@/lib/health/types"

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
}: {
  access: StaffAccess
  kpis: DashboardKpis
  tickets: QueueTicketRow[]
  activity: ActivityItem[]
  recent: RecentlyServedItem[]
  stats: QueueStats
  summary: RoleDashboardSummary
}) {
  void _recent
  const [intakeTicket, setIntakeTicket] = useState<QueueTicketRow | null>(null)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const firstName = access.fullName.split(" ")[0] || access.fullName
  const showWalkIn = canRegisterWalkIn(access.designation)

  const kpiCards = useMemo(() => {
    const byKey = new Map(kpis.cards.map((card) => [card.key, card]))
    return PRIORITY_KPI_KEYS.map((key) => byKey.get(key)).filter(
      (card): card is NonNullable<typeof card> => Boolean(card)
    )
  }, [kpis.cards])

  return (
    <div className="flex flex-1 flex-col gap-10">
      <PageIntro
        title={<NurseGreetingTitle firstName={firstName} />}
        action={
          <>
            {showWalkIn ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setWalkInOpen(true)}
              >
                <IconUserPlus className="size-4" aria-hidden />
                Register walk-in
              </Button>
            ) : null}
            <Button
              size="sm"
              render={<Link href="/nurse/queue" />}
              nativeButton={false}
            >
              Open queue
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <SectionLabel>At a glance</SectionLabel>
        <PanelFrame>
          <PanelGrid className="sm:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = KPI_ICONS[card.key]
              return (
                <PanelCell key={String(card.key)}>
                  <StatCard
                    flush
                    label={card.label}
                    value={String(card.value)}
                    description={card.description}
                    delta={card.delta}
                    lowerIsBetter={card.lowerIsBetter}
                    icon={Icon ? <Icon /> : undefined}
                    href={nurseKpiHref(card.key)}
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
              <NurseRequestsPanel access={access} summary={summary} />
            </PanelCell>
            <PanelCell className="lg:col-span-2">
              <ActivityFeed
                className={panelCardClassName}
                items={activity.slice(0, 6)}
                title="Recent activity"
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>

      <NurseIntakeSheet
        ticket={intakeTicket}
        open={Boolean(intakeTicket)}
        onOpenChange={(open) => {
          if (!open) setIntakeTicket(null)
        }}
      />

      <WalkInSheet
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        hideTrigger
      />
    </div>
  )
}
