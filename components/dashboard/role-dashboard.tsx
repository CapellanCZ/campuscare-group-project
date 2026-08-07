"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import {
  IconBellRinging,
  IconCertificate,
  IconClipboardList,
  IconHeartbeat,
  IconListCheck,
  IconStethoscope,
  IconUserHeart,
  IconUsers,
} from "@tabler/icons-react"

import { DashboardQuickNav } from "@/components/dashboard/dashboard-quick-nav"
import { AdminDashboardView } from "@/components/dashboard/admin-dashboard-view"
import { DentistDashboardView } from "@/components/dashboard/dentist-dashboard-view"
import { NurseDashboardView } from "@/components/dashboard/nurse-dashboard-view"
import { PhysicianDashboardView } from "@/components/dashboard/physician-dashboard-view"
import { RoleDashboardSummaries } from "@/components/dashboard/role-dashboard-summaries"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { StatCard } from "@/components/shared/stat-card"
import { WaitStatusBadge } from "@/components/queue/wait-status-badge"
import {
  PageIntro,
  PanelCell,
  PanelFrame,
  PanelGrid,
  panelCardClassName,
} from "@/components/layout/panel-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import { designationLabel, stationLabel } from "@/lib/health/roles"
import { ticketLabel } from "@/lib/health/mappers"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
} from "@/lib/health/types"
import { cn } from "@/lib/utils"
import { useStaffRealtimeRouterRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"

const KPI_ICONS: Record<
  string,
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  intake: IconHeartbeat,
  pending: IconClipboardList,
  queue: IconListCheck,
  waiting: IconListCheck,
  serving: IconStethoscope,
  completed: IconUserHeart,
  patients: IconUsers,
  requests: IconClipboardList,
  certs: IconCertificate,
  staff: IconUsers,
  announcements: IconBellRinging,
  appointments: IconListCheck,
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

export function RoleDashboard({
  access,
  kpis,
  tickets,
  boards,
  activity,
  recent,
  stats,
  summary,
}: {
  access: StaffAccess
  kpis: DashboardKpis
  tickets: QueueTicketRow[]
  boards: StationBoard[]
  activity: ActivityItem[]
  recent: RecentlyServedItem[]
  stats: QueueStats
  summary: RoleDashboardSummary
}) {
  useStaffRealtimeRouterRefresh(
    `staff-dashboard-${access.designation}`,
    STAFF_REALTIME_TABLES.dashboard
  )

  if (access.designation === "nurse") {
    return (
      <NurseDashboardView
        access={access}
        kpis={kpis}
        tickets={tickets}
        activity={activity}
        recent={recent}
        stats={stats}
        summary={summary}
      />
    )
  }

  if (access.designation === "physician") {
    return (
      <PhysicianDashboardView
        access={access}
        kpis={kpis}
        tickets={tickets}
        recent={recent}
        stats={stats}
        summary={summary}
      />
    )
  }

  if (access.designation === "dentist") {
    return (
      <DentistDashboardView
        access={access}
        kpis={kpis}
        tickets={tickets}
        recent={recent}
        stats={stats}
        summary={summary}
      />
    )
  }

  if (access.designation === "admin") {
    return (
      <AdminDashboardView access={access} kpis={kpis} summary={summary} />
    )
  }

  const waiting = tickets
    .filter((t) => t.status === "waiting")
    .slice(0, 8)

  const kpiCards = kpis.cards.slice(0, 3)

  const queueHref =
    access.designation === "queue_display"
      ? "/queue-management/display"
      : `/${access.designation}/queue`

  const firstName = access.fullName.split(" ")[0] || access.fullName
  const queueTitle = "Live queue"
  const queueDescription = "Active tickets at your station."
  const emptyQueueCopy = "Queue is clear."

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageIntro
          title={`Welcome back, ${firstName}`}
          description={`${designationLabel(access.designation)} overview · ${stats.totalWaiting} waiting · ${stats.currentlyServing} serving`}
          action={
            <Button
              size="sm"
              render={<Link href={queueHref} />}
              nativeButton={false}
            >
              Open queue
            </Button>
          }
        />
        <DashboardQuickNav designation={access.designation} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Today at a glance</SectionLabel>
        <PanelFrame>
          <PanelGrid
            className={cn(
              "sm:grid-cols-2",
              kpiCards.length >= 3 && "lg:grid-cols-3",
              kpiCards.length >= 4 && "xl:grid-cols-4",
              kpiCards.length >= 5 && "xl:grid-cols-3 2xl:grid-cols-6"
            )}
          >
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
                  />
                </PanelCell>
              )
            })}
          </PanelGrid>
        </PanelFrame>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Work now</SectionLabel>
        <PanelFrame>
          <PanelGrid className="lg:grid-cols-3">
            <PanelCell className="lg:col-span-2">
              <Card className={cn(panelCardClassName, "gap-0 py-0")}>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <CardTitle>{queueTitle}</CardTitle>
                      <CardDescription>{queueDescription}</CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="tabular-nums">
                        {waiting.length}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hidden sm:inline-flex"
                        render={<Link href={queueHref} />}
                        nativeButton={false}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-0 pb-2">
                  {waiting.length === 0 ? (
                    <Empty className="border-0 py-12">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <IconListCheck aria-hidden />
                        </EmptyMedia>
                        <EmptyTitle>Nothing in queue</EmptyTitle>
                        <EmptyDescription>{emptyQueueCopy}</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="min-w-0 overflow-x-auto">
                      <Table className="border-t">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-6">#</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead className="hidden sm:table-cell">
                              Station
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="pr-6" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {waiting.map((row) => (
                            <TableRow className="h-14" key={row.ticketId}>
                              <TableCell className="pl-6 font-medium tabular-nums">
                                {ticketLabel(row.queueNumber, row.ticketCode)}
                              </TableCell>
                              <TableCell className="max-w-40 truncate font-medium">
                                {row.patientName}
                              </TableCell>
                              <TableCell className="hidden text-muted-foreground sm:table-cell">
                                {stationLabel(row.station)}
                              </TableCell>
                              <TableCell>
                                <WaitStatusBadge
                                  status={row.status}
                                  waitMinutes={row.estimatedWaitMinutes}
                                />
                              </TableCell>
                              <TableCell className="pr-6" />
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </PanelCell>

            <PanelCell>
              <Card className={cn(panelCardClassName, "h-full")}>
                <CardHeader>
                  <CardTitle>Stations</CardTitle>
                  <CardDescription>
                    Live load across clinic lanes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {boards.length === 0 ? (
                    <p className="text-sm text-muted-foreground" role="status">
                      No station data yet.
                    </p>
                  ) : (
                    boards.map((board) => (
                      <div
                        key={board.station}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {board.label}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {board.waitingCount} waiting ·{" "}
                            {board.nowServing ?? "idle"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            board.status === "active" ? "secondary" : "outline"
                          }
                        >
                          {board.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Modules</SectionLabel>
        <PanelFrame>
          <PanelGrid className="lg:grid-cols-3">
            <RoleDashboardSummaries access={access} summary={summary} />

            <PanelCell className="lg:col-span-2">
              <ActivityFeed
                className={panelCardClassName}
                items={activity}
                title="Activity"
              />
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    </div>
  )
}
