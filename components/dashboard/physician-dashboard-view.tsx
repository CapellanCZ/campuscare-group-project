"use client"

import Link from "next/link"
import { useMemo, type ComponentType } from "react"
import {
  IconCalendarEvent,
  IconClipboardList,
  IconListCheck,
  IconStethoscope,
  IconUserHeart,
} from "@tabler/icons-react"

import {
  ClinicDateTime,
} from "@/components/dashboard/clinic-datetime"
import { DashboardQuickNav } from "@/components/dashboard/dashboard-quick-nav"
import { RoleDashboardSummaries } from "@/components/dashboard/role-dashboard-summaries"
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
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import type {
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
  waiting: IconListCheck,
  serving: IconStethoscope,
  completed: IconUserHeart,
  appointments: IconCalendarEvent,
  requests: IconClipboardList,
  queue: IconListCheck,
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

function physicianKpiHref(key: string): string | undefined {
  switch (key) {
    case "waiting":
    case "serving":
    case "queue":
      return "/physician/queue"
    case "appointments":
      return "/physician/appointments"
    case "completed":
      return "/physician/consultations"
    case "requests":
      return "/physician/requests"
    default:
      return undefined
  }
}

export function PhysicianDashboardView({
  access,
  kpis,
  tickets,
  recent: _recent,
  stats,
  summary,
}: {
  access: StaffAccess
  kpis: DashboardKpis
  tickets: QueueTicketRow[]
  recent: RecentlyServedItem[]
  stats: QueueStats
  summary: RoleDashboardSummary
}) {
  void _recent
  const firstName = access.fullName.split(" ")[0] || access.fullName
  const nowServing = tickets.find((t) => t.status === "called") ?? null
  const waiting = tickets
    .filter((t) => t.status === "waiting" || t.status === "called")
    .slice(0, 8)

  const kpiCards = useMemo(() => kpis.cards.slice(0, 4), [kpis.cards])

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-4">
        <PageIntro
          title={`Welcome back, ${firstName}`}
          description={
            <>
              Your physician station · {stats.totalWaiting} waiting ·{" "}
              {stats.currentlyServing} serving
              {" · "}
              <ClinicDateTime />
            </>
          }
          action={
            <Button
              size="sm"
              render={<Link href="/physician/queue" />}
              nativeButton={false}
            >
              Open queue
            </Button>
          }
        />
        <DashboardQuickNav designation={access.designation} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>At a glance</SectionLabel>
        <PanelFrame>
          <PanelGrid className="sm:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = KPI_ICONS[String(card.key)]
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
                    href={physicianKpiHref(String(card.key))}
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
          <PanelGrid className="lg:grid-cols-1">
            {nowServing ? (
              <PanelCell>
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
                    <Button
                      size="sm"
                      render={<Link href="/physician/queue" />}
                      nativeButton={false}
                    >
                      Continue in queue
                    </Button>
                  </CardContent>
                </Card>
              </PanelCell>
            ) : null}

            <PanelCell>
              <Card className={cn(panelCardClassName, "gap-0 py-0")}>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <CardTitle>Your station queue</CardTitle>
                      <CardDescription>
                        Patients waiting at the physician station after nurse
                        intake.
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="tabular-nums">
                        {waiting.length}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hidden sm:inline-flex"
                        render={<Link href="/physician/queue" />}
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
                        <EmptyDescription>
                          Patients appear after nurse intake.
                        </EmptyDescription>
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
                              Type
                            </TableHead>
                            <TableHead className="hidden md:table-cell">
                              Complaint
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden pr-6 lg:table-cell">
                              Wait
                            </TableHead>
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
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Clinic today</SectionLabel>
        <PanelFrame>
          <PanelGrid className="lg:grid-cols-3">
            <RoleDashboardSummaries access={access} summary={summary} />
          </PanelGrid>
        </PanelFrame>
      </div>
    </div>
  )
}
