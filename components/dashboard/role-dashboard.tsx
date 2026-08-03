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
import { NurseDashboardView } from "@/components/dashboard/nurse-dashboard-view"
import { RoleDashboardSummaries } from "@/components/dashboard/role-dashboard-summaries"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { RecentlyServedCard } from "@/components/shared/recently-served-card"
import { StatCard } from "@/components/shared/stat-card"
import { VitalsStrip } from "@/components/queue/vitals-strip"
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
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
} from "@/lib/health/types"
import { cn } from "@/lib/utils"

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

  const isSpecialty =
    access.designation === "physician" || access.designation === "dentist"
  const isAdmin = access.designation === "admin"
  const isPhysician = access.designation === "physician"
  const nowServing = tickets.find((t) => t.status === "called") ?? null
  const waiting = tickets
    .filter(
      (t) =>
        t.status === "waiting" || (isSpecialty && t.status === "called")
    )
    .slice(0, 8)

  const kpiCards = kpis.cards.slice(
    0,
    isPhysician ? 4 : isAdmin || isSpecialty ? 6 : 3
  )

  const queueHref =
    access.designation === "queue_display"
      ? "/queue-management/display"
      : `/${access.designation}/queue`

  const firstName = access.fullName.split(" ")[0] || access.fullName
  const queueTitle =
    access.designation === "dentist"
      ? "Today's dental queue"
      : isPhysician
        ? "Your station queue"
      : isSpecialty
        ? "Station queue"
        : "Live queue"
  const queueDescription = isAdmin
    ? "Clinic-wide tickets (view only)."
    : access.designation === "dentist"
      ? "Patients assigned for dental consultation."
      : "Active tickets at your station."
  const emptyQueueCopy = isSpecialty
    ? "Patients appear after nurse intake."
    : "Queue is clear."

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageIntro
          title={`Welcome back, ${firstName}`}
          description={
            isPhysician
              ? `Your physician station · ${stats.totalWaiting} waiting · ${stats.currentlyServing} serving`
              : `${designationLabel(access.designation)} overview · ${stats.totalWaiting} waiting · ${stats.currentlyServing} serving`
          }
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
            {isSpecialty && nowServing ? (
              <PanelCell className="lg:col-span-3">
                <Card className={cn(panelCardClassName)}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-base">Now serving</CardTitle>
                      <CardDescription className="truncate">
                        {nowServing.patientName}
                        {nowServing.campusId
                          ? ` · ${nowServing.campusId}`
                          : ""}
                      </CardDescription>
                    </div>
                    <Badge className="tabular-nums">
                      {ticketLabel(
                        nowServing.queueNumber,
                        nowServing.ticketCode
                      )}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Nurse vitals
                    </p>
                    <VitalsStrip
                      vitals={nowServing.vitals}
                      chiefComplaint={nowServing.chiefComplaint}
                    />
                  </CardContent>
                </Card>
              </PanelCell>
            ) : null}

            <PanelCell className={isPhysician ? "lg:col-span-3" : "lg:col-span-2"}>
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
                            {isSpecialty ? (
                              <>
                                <TableHead className="hidden sm:table-cell">
                                  Type
                                </TableHead>
                                <TableHead className="hidden md:table-cell">
                                  Complaint
                                </TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden pr-6 lg:table-cell">
                                  Wait
                                </TableHead>
                              </>
                            ) : (
                              <>
                                <TableHead className="hidden sm:table-cell">
                                  Station
                                </TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="pr-6" />
                              </>
                            )}
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
                              {isSpecialty ? (
                                <>
                                  <TableCell className="hidden sm:table-cell">
                                    <Badge variant="outline">
                                      {patientTypeLabel(row.patientType)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden max-w-[10rem] truncate text-muted-foreground md:table-cell">
                                    {row.chiefComplaint || "—"}
                                  </TableCell>
                                  <TableCell>
                                    <WaitStatusBadge
                                      status={row.status}
                                      waitMinutes={row.estimatedWaitMinutes}
                                    />
                                  </TableCell>
                                  <TableCell className="hidden pr-6 text-muted-foreground tabular-nums lg:table-cell">
                                    {row.estimatedWaitMinutes != null
                                      ? `${row.estimatedWaitMinutes}m`
                                      : "—"}
                                  </TableCell>
                                </>
                              ) : (
                                <>
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
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </PanelCell>

            {!isPhysician ? (
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
            ) : null}
          </PanelGrid>
        </PanelFrame>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Modules</SectionLabel>
        <PanelFrame>
          <PanelGrid className="lg:grid-cols-3">
            <RoleDashboardSummaries access={access} summary={summary} />

            {!isPhysician ? (
              <PanelCell className="lg:col-span-2">
                <ActivityFeed
                  className={panelCardClassName}
                  items={activity}
                  title="Activity"
                />
              </PanelCell>
            ) : null}

            <PanelCell>
              <Card className={cn(panelCardClassName, "h-full")}>
                <CardHeader>
                  <CardTitle>Recently served</CardTitle>
                  <CardDescription>
                    Completions from this shift.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recent.length === 0 ? (
                    <Empty className="border-0 py-8">
                      <EmptyHeader>
                        <EmptyTitle>No completions yet</EmptyTitle>
                        <EmptyDescription>
                          Finished visits from this shift will show here.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    recent.slice(0, 4).map((item) => (
                      <RecentlyServedCard key={item.ticketId} item={item} />
                    ))
                  )}
                </CardContent>
              </Card>
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    </div>
  )
}
