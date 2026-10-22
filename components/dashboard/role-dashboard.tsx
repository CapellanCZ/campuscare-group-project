"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ComponentType } from "react"
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
import {
  WaitStatusBadge,
  waitTimerSince,
} from "@/components/queue/wait-status-badge"
import {
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DashboardPageBundle } from "@/features/dashboard/lib/dashboard-page-types"
import { emptyDashboardBundle } from "@/features/dashboard/lib/empty-dashboard"
import {
  getCachedDashboard,
  loadDashboardBundle,
  saveDashboardCache,
} from "@/features/dashboard/lib/prefetch-dashboard"
import { loadQueueBundle } from "@/features/queue/lib/prefetch-queue"
import {
  dashboardCacheKey,
  staffCacheIsFresh,
} from "@/lib/ui/staff-data-cache"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import { stationLabel } from "@/lib/health/roles"
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
import { useStaffRealtimeRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import { appToast } from "@/lib/feedback/app-toast"

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

function applyBundle(
  setBundle: (b: DashboardPageBundle) => void,
  next: DashboardPageBundle
) {
  setBundle(next)
}

export function RoleDashboard({
  access,
  hydrateFromCache = false,
  kpis: initialKpis,
  tickets: initialTickets,
  boards: initialBoards,
  activity: initialActivity,
  recent: initialRecent,
  stats: initialStats,
  summary: initialSummary,
  ops: initialOps = null,
}: {
  access: StaffAccess
  /** Auth-only RSC: paint static chrome, load Supabase data on the client. */
  hydrateFromCache?: boolean
  kpis?: DashboardKpis
  tickets?: QueueTicketRow[]
  boards?: StationBoard[]
  activity?: ActivityItem[]
  recent?: RecentlyServedItem[]
  stats?: QueueStats
  summary?: RoleDashboardSummary
  ops?: import("@/features/admin/types/ops").AdminOpsSnapshot | null
}) {
  const cached = hydrateFromCache
    ? getCachedDashboard(access.designation)
    : null
  const seed =
    cached ??
    (initialKpis && initialTickets && initialStats && initialSummary
      ? {
          kpis: initialKpis,
          tickets: initialTickets,
          boards: initialBoards ?? [],
          activity: initialActivity ?? [],
          recent: initialRecent ?? [],
          stats: initialStats,
          summary: initialSummary,
          ops: initialOps ?? null,
        }
      : emptyDashboardBundle(access.designation))

  const [bundle, setBundle] = useState<DashboardPageBundle>(seed)
  // Cache hit paints instantly; cold visit shows skeleton until soft load finishes.
  const [dataLoading, setDataLoading] = useState(
    () => hydrateFromCache && !cached
  )
  const hydratedRef = useRef(false)

  // Warm session cache from RSC seed so revisits / prefetch share the payload.
  useEffect(() => {
    if (hydrateFromCache) return
    if (!initialKpis || !initialTickets || !initialStats || !initialSummary) {
      return
    }
    saveDashboardCache(access.designation, {
      kpis: initialKpis,
      tickets: initialTickets,
      boards: initialBoards ?? [],
      activity: initialActivity ?? [],
      recent: initialRecent ?? [],
      stats: initialStats,
      summary: initialSummary,
      ops: initialOps ?? null,
    })
  }, [
    access.designation,
    hydrateFromCache,
    initialKpis,
    initialTickets,
    initialBoards,
    initialActivity,
    initialRecent,
    initialStats,
    initialSummary,
    initialOps,
  ])

  useEffect(() => {
    if (!hydrateFromCache || hydratedRef.current) return
    hydratedRef.current = true
    const hit = getCachedDashboard(access.designation)
    const fresh =
      Boolean(hit) && staffCacheIsFresh(dashboardCacheKey(access.designation))
    if (hit) {
      applyBundle(setBundle, hit)
      setDataLoading(false)
    }
    if (fresh) return

    const isNurse = access.designation === "nurse"
    const load = isNurse
      ? Promise.all([
          loadDashboardBundle(access.designation, { force: Boolean(hit) }),
          // Warm queue SoT so the nurse queue opens from cache.
          loadQueueBundle(access.designation, { force: Boolean(hit) }).catch(
            () => null
          ),
        ]).then(([next]) => next)
      : loadDashboardBundle(access.designation, { force: Boolean(hit) })

    void load
      .then((next) => {
        applyBundle(setBundle, next)
        setDataLoading(false)
      })
      .catch((error) => {
        setDataLoading(false)
        if (!hit && !initialKpis) {
          appToast.error({
            title: "Unable to load dashboard",
            description:
              error instanceof Error
                ? error.message
                : "Check your connection and try again.",
          })
        }
      })
  }, [access.designation, hydrateFromCache, initialKpis])

  useStaffRealtimeRefresh(
    `staff-dashboard-${access.designation}`,
    STAFF_REALTIME_TABLES.dashboard,
    () => {
      // Silent refresh — keep current KPIs visible while updating.
      void loadDashboardBundle(access.designation, { force: true })
        .then((next) => applyBundle(setBundle, next))
        .catch(() => undefined)
    }
  )

  const {
    kpis,
    tickets,
    boards,
    activity,
    recent,
    stats,
    summary,
    ops,
  } = bundle

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
        dataLoading={dataLoading}
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
        dataLoading={dataLoading}
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
        dataLoading={dataLoading}
      />
    )
  }

  if (access.designation === "admin") {
    if (!ops) {
      return (
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <SectionLabel>At a glance</SectionLabel>
            <PanelFrame>
              <PanelGrid className="grid-cols-2 lg:grid-cols-4">
                {kpis.cards.slice(0, 4).map((card) => {
                  const Icon = KPI_ICONS[String(card.key)]
                  return (
                    <PanelCell key={String(card.key)}>
                      <StatCard
                        flush
                        compact
                        label={card.label}
                        value={String(card.value)}
                        description={card.description}
                        icon={Icon ? <Icon /> : undefined}
                        loading={dataLoading}
                      />
                    </PanelCell>
                  )
                })}
              </PanelGrid>
            </PanelFrame>
          </div>
        </div>
      )
    }
    return <AdminDashboardView access={access} ops={ops} />
  }

  const waiting = tickets
    .filter((t) => t.status === "waiting")
    .slice(0, 10)

  const kpiCards = kpis.cards.slice(0, 3)

  const queueHref =
    access.designation === "queue_display"
      ? "/queue-management/display"
      : `/${access.designation}/queue`

  const queueTitle = "Live queue"
  const queueDescription = "Active tickets at your station."
  const emptyQueueCopy = "Queue is clear."

  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardQuickNav designation={access.designation} />

      <div className="flex flex-col gap-2">
        <SectionLabel>Today at a glance</SectionLabel>
        <PanelFrame>
          <PanelGrid
            className={cn(
              "grid-cols-2",
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
                    compact
                    label={card.label}
                    value={String(card.value)}
                    description={card.description}
                    delta={card.delta}
                    lowerIsBetter={card.lowerIsBetter}
                    icon={Icon ? <Icon /> : undefined}
                    loading={dataLoading}
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
                <CardHeader className="gap-4 border-b px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-base sm:text-lg">
                        {queueTitle}
                      </CardTitle>
                      <CardDescription>{queueDescription}</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {dataLoading ? (
                        <Skeleton className="h-5 w-8 rounded-full" />
                      ) : (
                        <Badge variant="secondary" className="tabular-nums">
                          {waiting.length}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={queueHref} />}
                        nativeButton={false}
                      >
                        Open queue
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-0 pb-2">
                  {dataLoading ? (
                    <div className="space-y-3 px-6 py-6">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-3/4 rounded-lg" />
                    </div>
                  ) : waiting.length === 0 ? (
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
                                  since={waitTimerSince(row)}
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
                  {dataLoading ? (
                    <div className="space-y-2 py-1">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  ) : boards.length === 0 ? (
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
                            board.status === "available"
                              ? "default"
                              : board.status === "on_break"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {board.status === "available"
                            ? "Available"
                            : board.status === "on_break"
                              ? "On Break"
                              : "Not Available"}
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
