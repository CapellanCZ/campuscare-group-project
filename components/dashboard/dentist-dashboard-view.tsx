"use client"

import Link from "next/link"
import { useMemo, useState, useTransition, type ComponentType } from "react"
import { useRouter } from "next/navigation"
import {
  IconBell,
  IconCalendarEvent,
  IconCalendarTime,
  IconListCheck,
  IconStethoscope,
  IconUserHeart,
} from "@tabler/icons-react"

import { StaffWelcomeLoader } from "@/components/dashboard/staff-welcome-loader"
import { StatCard } from "@/components/shared/stat-card"
import { VitalsStrip } from "@/components/queue/vitals-strip"
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
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import { actionCallNext } from "@/lib/health/queue-server-actions"
import { queueToasts } from "@/lib/feedback/toast-messages"
import { appToast } from "@/lib/feedback/app-toast"
import type {
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
} from "@/lib/health/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

const KPI_ICONS: Record<
  string,
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  waiting: IconListCheck,
  ongoing: IconStethoscope,
  completed: IconUserHeart,
  appointments: IconCalendarEvent,
  schedule: IconCalendarTime,
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

function dentistKpiHref(key: string): string | undefined {
  switch (key) {
    case "waiting":
    case "ongoing":
      return "/dentist/queue"
    case "completed":
    case "appointments":
      return "/dentist/consultations"
    case "schedule":
      return "/dentist/settings"
    default:
      return undefined
  }
}

export function DentistDashboardView({
  access,
  kpis,
  tickets,
  recent: _recent,
  stats: _stats,
  summary: _summary,
  dataLoading = false,
}: {
  access: StaffAccess
  kpis: DashboardKpis
  tickets: QueueTicketRow[]
  recent: RecentlyServedItem[]
  stats: QueueStats
  summary: RoleDashboardSummary
  dataLoading?: boolean
}) {
  void _recent
  void _stats
  void _summary

  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [page, setPage] = useState(1)
  const canCall = can(access.designation, "queue.call_next")

  const nowServing =
    tickets.find((t) => t.status === "ongoing") ??
    tickets.find((t) => t.status === "called") ??
    null
  const waiting = useMemo(
    () =>
      [...tickets]
        .filter(
          (t) =>
            t.status === "waiting" ||
            t.status === "called" ||
            t.status === "ongoing"
        )
        .sort((a, b) => {
          if (a.priority === "urgent" && b.priority !== "urgent") return -1
          if (b.priority === "urgent" && a.priority !== "urgent") return 1
          return (a.estimatedWaitMinutes ?? 0) - (b.estimatedWaitMinutes ?? 0)
        }),
    [tickets]
  )

  const totalPages = Math.max(1, Math.ceil(waiting.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = waiting.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const kpiCards = useMemo(() => kpis.cards.slice(0, 5), [kpis.cards])

  function callNext() {
    startTransition(async () => {
      const result = await actionCallNext("dentist")
      if (!result.ok) {
        queueToasts.failed(result.error)
        return
      }
      appToast.success({ title: result.message ?? "Called next patient" })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6 sm:gap-8">
      <StaffWelcomeLoader
        open={dataLoading}
        staffName={access.fullName}
        role="dentist"
      />
      <div className="flex flex-col gap-3">
        <SectionLabel>At a glance</SectionLabel>
        <PanelFrame>
          <PanelGrid className="grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpiCards.map((card) => {
              const Icon = KPI_ICONS[String(card.key)]
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
                    href={dentistKpiHref(String(card.key))}
                    loading={dataLoading}
                  />
                </PanelCell>
              )
            })}
          </PanelGrid>
        </PanelFrame>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>Work now</SectionLabel>
        <PanelFrame>
          <PanelGrid className="lg:grid-cols-1">
            {!dataLoading && nowServing ? (
              <PanelCell>
                <Card className={cn(panelCardClassName)}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-base">
                        Ongoing consultation
                      </CardTitle>
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
                      render={<Link href="/dentist/queue" />}
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
                <CardHeader className="gap-4 border-b px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base sm:text-lg">
                      Today&apos;s dental queue
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      {canCall ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending || dataLoading}
                          onClick={callNext}
                        >
                          <IconBell
                            data-icon="inline-start"
                            className="size-4"
                            aria-hidden
                          />
                          Call next
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href="/dentist/queue" />}
                        nativeButton={false}
                      >
                        Open queue
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 p-0">
                  {dataLoading ? (
                    <div className="min-w-0 overflow-x-auto">
                      <Table>
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
                            <TableHead className="pr-6">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[0, 1, 2].map((row) => (
                            <TableRow className="h-14" key={row}>
                              <TableCell className="pl-6">
                                <Skeleton className="h-4 w-10" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-28" />
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Skeleton className="h-5 w-16" />
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell className="pr-6">
                                <Skeleton className="h-5 w-16" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : pageRows.length === 0 ? (
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
                      <Table>
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
                            <TableHead className="pr-6">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageRows.map((row) => (
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
                              <TableCell className="pr-6">
                                <WaitStatusBadge
                                  status={row.status}
                                  since={waitTimerSince(row)}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {waiting.length > PAGE_SIZE ? (
                    <div className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
                      <p className="text-sm text-muted-foreground" role="status">
                        Page {safePage} of {totalPages} · {waiting.length}{" "}
                        tickets
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={safePage <= 1 || pending}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={safePage >= totalPages || pending}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </PanelCell>
          </PanelGrid>
        </PanelFrame>
      </div>
    </div>
  )
}
