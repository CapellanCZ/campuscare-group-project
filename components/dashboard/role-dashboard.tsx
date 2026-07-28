"use client"

import Link from "next/link"

import { ActivityFeed } from "@/components/shared/activity-feed"
import { RecentlyServedCard } from "@/components/shared/recently-served-card"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { StaffAccess } from "@/lib/auth/types"
import { designationLabel, stationLabel } from "@/lib/health/roles"
import { ticketLabel } from "@/lib/health/mappers"
import { VitalsStrip } from "@/components/queue/vitals-strip"
import type {
  ActivityItem,
  DashboardKpis,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
} from "@/lib/health/types"
import { IconChecklist, IconUsers } from "@tabler/icons-react"

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
  const nowServing = tickets.find((t) => t.status === "called") ?? null
  const waiting = tickets
    .filter((t) => t.status === "waiting" || (isSpecialty && t.status === "called"))
    .slice(0, isSpecialty ? 8 : 6)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Good day, {access.fullName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {designationLabel(access.designation)} overview ·{" "}
            {stats.totalWaiting} waiting · {stats.currentlyServing} serving
          </p>
        </div>
        <Button
          render={
            <Link
              href={
                access.designation === "queue_display"
                  ? "/queue-management/display"
                  : `/${access.designation}/queue`
              }
            />
          }
          nativeButton={false}
        >
          Open queue
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.cards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={card.value}
            description={card.description}
            delta={card.delta}
            lowerIsBetter={card.lowerIsBetter}
            className="xl:col-span-1 sm:col-span-1"
          />
        ))}
      </div>

      {isSpecialty && nowServing ? (
        <Card className="min-w-0 shadow-none dark:ring-0">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Now serving</CardTitle>
              <Badge>
                {ticketLabel(nowServing.queueNumber, nowServing.ticketCode)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-(--card-spacing)">
            <div className="min-w-0">
              <p className="font-medium">{nowServing.patientName}</p>
              <p className="text-sm text-muted-foreground">
                {nowServing.campusId ?? "No campus ID"} ·{" "}
                {nowServing.consultationType ?? "Consultation"}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Nurse vitals
              </p>
              <VitalsStrip
                vitals={nowServing.vitals}
                chiefComplaint={nowServing.chiefComplaint}
              />
            </div>
            {nowServing.intakeNotes?.trim() ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Notes:</span>{" "}
                {nowServing.intakeNotes}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 shadow-none dark:ring-0 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b">
            <CardTitle className="text-base">
              {access.designation === "admin"
                ? "Live queue overview"
                : access.designation === "nurse"
                  ? "Today's queue"
                  : "Your station queue"}
            </CardTitle>
            <Badge variant="outline">{waiting.length} active</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {waiting.length === 0 ? (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconUsers />
                  </EmptyMedia>
                  <EmptyTitle>Queue is clear</EmptyTitle>
                  <EmptyDescription>
                    {isSpecialty
                      ? "Patients appear here after nurse intake assigns them to your station."
                      : "New check-ins and walk-ins will appear here."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Patient</TableHead>
                    {isSpecialty ? (
                      <TableHead className="hidden md:table-cell">
                        Nurse vitals
                      </TableHead>
                    ) : (
                      <>
                        <TableHead className="hidden sm:table-cell">
                          Station
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Type
                        </TableHead>
                      </>
                    )}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waiting.map((row) => (
                    <TableRow key={row.ticketId}>
                      <TableCell className="font-medium tabular-nums">
                        {ticketLabel(row.queueNumber, row.ticketCode)}
                      </TableCell>
                      <TableCell className="max-w-[10rem]">
                        <p className="truncate font-medium">{row.patientName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.campusId ?? row.consultationType}
                        </p>
                      </TableCell>
                      {isSpecialty ? (
                        <TableCell className="hidden min-w-48 md:table-cell">
                          <VitalsStrip
                            vitals={row.vitals}
                            chiefComplaint={row.chiefComplaint}
                            dense
                          />
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="hidden sm:table-cell">
                            {stationLabel(row.station)}
                          </TableCell>
                          <TableCell className="hidden max-w-[10rem] truncate md:table-cell">
                            {row.consultationType}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-none dark:ring-0">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Stations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-(--card-spacing)">
            {boards.map((board) => (
              <div
                key={board.station}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{board.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {board.waitingCount} waiting · now{" "}
                    {board.nowServing ?? "—"}
                  </p>
                </div>
                <Badge
                  variant={board.status === "active" ? "default" : "outline"}
                >
                  {board.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActivityFeed className="lg:col-span-2" items={activity} />
        <Card className="min-w-0 shadow-none dark:ring-0">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconChecklist className="size-4" />
              Recently served
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-(--card-spacing)">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completions yet today.</p>
            ) : (
              recent.map((item) => (
                <RecentlyServedCard key={item.ticketId} item={item} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
