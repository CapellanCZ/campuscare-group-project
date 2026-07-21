import { IconChartBar } from "@tabler/icons-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/features/common/components/page-header"
import { SummaryCard } from "@/features/common/components/summary-card"
import { AppointmentStatusBadge } from "@/features/physician/components/appointment-status-badge"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"
import type { AppointmentStatus } from "@/features/physician/types"

type ReportsPageProps = {
  workspace: PhysicianWorkspace
}

export function PhysicianReportsPage({ workspace }: ReportsPageProps) {
  const byStatus = workspace.appointments.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1
      return acc
    },
    {}
  )

  const recentCompleted = workspace.appointments
    .filter((a) => a.status === "completed")
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Practice snapshot"
        description="Quick operational counts for your caseload. Export tooling can plug in later."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total appointments"
          value={String(workspace.appointments.length)}
          hint="Loaded in this workspace"
          icon={<IconChartBar className="size-4" />}
        />
        <SummaryCard
          title="Completed"
          value={String(byStatus.completed ?? 0)}
          hint="Closed encounters"
        />
        <SummaryCard
          title="Cancelled"
          value={String(byStatus.cancelled ?? 0)}
          hint="Includes patient and clinic cancels"
        />
        <SummaryCard
          title="No-shows"
          value={String(byStatus.no_show ?? 0)}
          hint="Missed without cancellation"
        />
      </section>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {Object.entries(byStatus).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2"
            >
              <AppointmentStatusBadge status={status as AppointmentStatus} />
              <span className="text-sm font-medium">{count}</span>
            </div>
          ))}
          {Object.keys(byStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointment data yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recently completed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentCompleted.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No completed visits in this period.
            </p>
          ) : (
            recentCompleted.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.patientName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.reason ?? "Clinic visit"}
                  </p>
                </div>
                <AppointmentStatusBadge status={row.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
