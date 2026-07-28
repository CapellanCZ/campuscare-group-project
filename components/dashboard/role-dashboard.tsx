"use client"

import Link from "next/link"
import { useState } from "react"

import { ActivityFeed } from "@/components/shared/activity-feed"
import { RecentlyServedCard } from "@/components/shared/recently-served-card"
import { StatCard } from "@/components/shared/stat-card"
import { NurseIntakeSheet } from "@/components/queue/nurse-intake-sheet"
import { NurseWorkbench } from "@/components/queue/nurse-workbench"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { StaffAccess } from "@/lib/auth/types"
import { designationLabel, stationLabel } from "@/lib/health/roles"
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import { needsNurseIntake } from "@/lib/health/nurse-queue"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
} from "@/lib/health/types"
import { cn } from "@/lib/utils"

export function RoleDashboard({
  access,
  kpis,
  tickets,
  boards,
  activity,
  recent,
  stats,
}: {
  access: StaffAccess
  kpis: DashboardKpis
  tickets: QueueTicketRow[]
  boards: StationBoard[]
  activity: ActivityItem[]
  recent: RecentlyServedItem[]
  stats: QueueStats
}) {
  const isSpecialty =
    access.designation === "physician" || access.designation === "dentist"
  const isNurse = access.designation === "nurse"
  const [intakeTicket, setIntakeTicket] = useState<QueueTicketRow | null>(null)
  const nowServing = tickets.find((t) => t.status === "called") ?? null
  const waiting = (
    isNurse
      ? tickets.filter((t) => needsNurseIntake(t))
      : tickets.filter(
          (t) =>
            t.status === "waiting" || (isSpecialty && t.status === "called")
        )
  ).slice(0, 8)

  const nurseStats = [
    {
      label: "Need intake",
      value: String(waiting.length),
    },
    {
      label: "Walk-ins",
      value: String(stats.walkIns),
    },
    {
      label: "Completed today",
      value: String(stats.completedToday),
    },
  ]

  const queueHref =
    access.designation === "queue_display"
      ? "/queue-management/display"
      : `/${access.designation}/queue`

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageIntro
        title={`Welcome back, ${access.fullName.split(" ")[0]}`}
        description={`${designationLabel(access.designation)} station · ${stats.totalWaiting} waiting · ${stats.currentlyServing} serving`}
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

      <PanelFrame>
        <PanelGrid className="lg:grid-cols-3">
          {(isNurse ? nurseStats : kpis.cards.slice(0, 3)).map((card) => (
            <PanelCell key={"key" in card ? card.key : card.label}>
              <StatCard
                flush
                label={card.label}
                value={card.value}
                description={"description" in card ? card.description : undefined}
                delta={"delta" in card ? card.delta : undefined}
                lowerIsBetter={
                  "lowerIsBetter" in card ? card.lowerIsBetter : undefined
                }
              />
            </PanelCell>
          ))}

          {isNurse ? (
            <PanelCell className="lg:col-span-3">
              <NurseWorkbench
                tickets={tickets}
                onStartIntake={setIntakeTicket}
                variant="panel"
              />
            </PanelCell>
          ) : null}

          {isSpecialty && nowServing ? (
            <PanelCell className="lg:col-span-3">
              <Card className={cn(panelCardClassName)}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-base">Now serving</CardTitle>
                    <CardDescription>
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

          <PanelCell className="lg:col-span-2">
            <Card className={cn(panelCardClassName, "gap-0 py-0")}>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <CardTitle>
                      {isNurse
                        ? "Needs intake"
                        : isSpecialty
                          ? "Station queue"
                          : "Live queue"}
                    </CardTitle>
                    <CardDescription>
                      {isNurse
                        ? "Patients waiting for vitals and specialty assignment."
                        : "Active tickets at your station."}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    {waiting.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                {waiting.length === 0 ? (
                  <p className="px-6 py-10 text-sm text-muted-foreground">
                    {isSpecialty
                      ? "Patients appear after nurse intake."
                      : isNurse
                        ? "No patients waiting for intake."
                        : "Queue is clear."}
                  </p>
                ) : (
                  <Table className="border-t">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">#</TableHead>
                        <TableHead>Patient</TableHead>
                        {isNurse ? (
                          <>
                            <TableHead className="hidden md:table-cell">
                              ID
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="pr-6 text-right">
                              Actions
                            </TableHead>
                          </>
                        ) : isSpecialty ? (
                          <>
                            <TableHead className="hidden md:table-cell">
                              Vitals
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="pr-6" />
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
                          {isNurse ? (
                            <>
                              <TableCell className="hidden max-w-[9rem] truncate text-muted-foreground md:table-cell tabular-nums">
                                {row.campusId ?? "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {patientTypeLabel(row.patientType)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <WaitStatusBadge
                                  status={row.status}
                                  waitMinutes={row.estimatedWaitMinutes}
                                />
                              </TableCell>
                              <TableCell className="pr-6 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => setIntakeTicket(row)}
                                >
                                  Intake
                                </Button>
                              </TableCell>
                            </>
                          ) : isSpecialty ? (
                            <>
                              <TableCell className="hidden min-w-40 md:table-cell">
                                <VitalsStrip
                                  vitals={row.vitals}
                                  chiefComplaint={row.chiefComplaint}
                                  dense
                                />
                              </TableCell>
                              <TableCell>
                                <WaitStatusBadge
                                  status={row.status}
                                  waitMinutes={row.estimatedWaitMinutes}
                                />
                              </TableCell>
                              <TableCell className="pr-6" />
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
                )}
              </CardContent>
            </Card>
          </PanelCell>

          <PanelCell>
            <Card className={cn(panelCardClassName)}>
              <CardHeader>
                <CardTitle>Stations</CardTitle>
                <CardDescription>Live load across clinic lanes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {boards.map((board) => (
                  <div
                    key={board.station}
                    className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0 last:pb-0"
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
                ))}
              </CardContent>
            </Card>
          </PanelCell>

          {!isNurse ? (
            <PanelCell className="lg:col-span-2">
              <ActivityFeed
                className={panelCardClassName}
                items={activity}
                title="Activity"
              />
            </PanelCell>
          ) : null}

          <PanelCell className={isNurse ? "lg:col-span-3" : undefined}>
            <Card className={cn(panelCardClassName)}>
              <CardHeader>
                <CardTitle>Recently served</CardTitle>
                <CardDescription>Completions from this shift.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No completions yet today.
                  </p>
                ) : (
                  recent.slice(0, isNurse ? 6 : 4).map((item) => (
                    <RecentlyServedCard key={item.ticketId} item={item} />
                  ))
                )}
              </CardContent>
            </Card>
          </PanelCell>
        </PanelGrid>
      </PanelFrame>

      {isNurse ? (
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
