import {
  IconCalendarCheck,
  IconClipboardList,
  IconStethoscope,
  IconUserCheck,
} from "@tabler/icons-react"
import Link from "next/link"

import { Badge } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/features/common/components/page-header"
import { SummaryCard } from "@/features/common/components/summary-card"
import { AppointmentStatusBadge } from "@/features/physician/components/appointment-status-badge"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"
import { formatClinicTime, zonedDayKey } from "@/lib/physician/timezone"
import { CLINIC_TIMEZONE } from "@/features/physician/types"

type PhysicianHomeProps = {
  workspace: PhysicianWorkspace
}

export function PhysicianHome({ workspace }: PhysicianHomeProps) {
  const todayKey = zonedDayKey(new Date().toISOString(), CLINIC_TIMEZONE)
  const todays = workspace.appointments
    .filter(
      (a) =>
        zonedDayKey(a.startsAt, a.timezone) === todayKey &&
        a.status !== "cancelled"
    )
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Physician Dashboard"
        subtitle={`Welcome, ${workspace.doctorName}`}
        description="Today's clinic board — appointments, quick stats, and consultation entry points."
      />

      {workspace.source === "demo" ? (
        <Badge variant="warning-light" size="sm">
          Showing demo clinical data until a physician account has live rows
        </Badge>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Today"
          value={String(workspace.stats.todayCount)}
          hint="Active appointments today"
          icon={<IconCalendarCheck className="size-4" />}
        />
        <SummaryCard
          title="Confirmed"
          value={String(workspace.stats.confirmedCount)}
          hint="Ready to see"
          icon={<IconUserCheck className="size-4" />}
        />
        <SummaryCard
          title="In progress"
          value={String(workspace.stats.inProgressCount)}
          hint="Open consultations"
          icon={<IconStethoscope className="size-4" />}
        />
        <SummaryCard
          title="Completed this week"
          value={String(workspace.stats.completedThisWeek)}
          hint={`${workspace.stats.pendingCount} pending · ${workspace.stats.noShowCount} no-shows`}
          icon={<IconClipboardList className="size-4" />}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button render={<Link href="/physician/appointments" />} nativeButton={false}>
          Open appointments
        </Button>
        <Button
          variant="outline"
          render={<Link href="/physician/settings" />}
          nativeButton={false}
        >
          Manage schedule
        </Button>
        <Button
          variant="outline"
          render={<Link href="/physician/patients" />}
          nativeButton={false}
        >
          Find patient
        </Button>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Today&apos;s appointments</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            render={<Link href="/physician/appointments" />}
            nativeButton={false}
          >
            View all
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {todays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="font-medium">No appointments today</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your board is clear. Check upcoming days or update availability.
              </p>
            </div>
          ) : (
            todays.map((apt) => (
              <div
                key={apt.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{apt.patientName}</p>
                    <AppointmentStatusBadge status={apt.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatClinicTime(apt.startsAt, apt.timezone)} ·{" "}
                    {apt.reason ?? "No reason listed"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={apt.status === "in_progress" ? "default" : "outline"}
                  render={
                    <Link href={`/physician/consultation/${apt.id}`} />
                  }
                  nativeButton={false}
                >
                  {apt.status === "in_progress" ? "Continue" : "Open"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
