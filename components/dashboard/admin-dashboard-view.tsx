"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { ComponentType } from "react"
import {
  IconBellPlus,
  IconChartBar,
  IconClipboardList,
  IconDental,
  IconHourglass,
  IconStethoscope,
  IconUsers,
  IconUserCheck,
} from "@tabler/icons-react"

import { PageIntro } from "@/components/layout/panel-frame"
import { StatCard } from "@/components/shared/stat-card"
import { ReportChartCard } from "@/features/reports/components/report-chart-card"
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
  adminElevatedCardClassName,
  adminPageShellClassName,
} from "@/features/admin/lib/admin-surface"
import type { AdminOpsSnapshot } from "@/features/admin/types/ops"
import type { StaffAccess } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

function formatLastLogin(iso: string | null) {
  if (!iso) return "Never signed in"
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function roleLabel(role: string) {
  if (role === "nurse") return "Nurse"
  if (role === "physician") return "Physician"
  if (role === "dentist") return "Dentist"
  return role
}

function statusVariant(
  status: "active" | "invited" | "inactive"
): "default" | "secondary" | "outline" {
  if (status === "active") return "default"
  if (status === "invited") return "secondary"
  return "outline"
}

export function AdminDashboardView({
  access,
  ops,
}: {
  access: StaffAccess
  ops: AdminOpsSnapshot
}) {
  const firstName = access.fullName.split(" ")[0] || access.fullName
  const [trendMode, setTrendMode] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  )

  const deltaConsult =
    ops.summary.consultationsToday - ops.summary.consultationsYesterday

  const trendSeries = useMemo(() => {
    const points =
      trendMode === "weekly"
        ? ops.consultationTrend.weekly
        : trendMode === "monthly"
          ? ops.consultationTrend.monthly
          : ops.consultationTrend.daily
    return {
      key: "consult_overview",
      title: "Consultation overview",
      description: "Medical vs dental volume",
      kind: "multiline" as const,
      points,
    }
  }, [ops.consultationTrend, trendMode])

  const summaryCards: Array<{
    key: string
    label: string
    value: string
    description?: string
    delta?: number
    icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  }> = [
    {
      key: "consults",
      label: "Consultations today",
      value: String(ops.summary.consultationsToday),
      description: "All recorded visits",
      delta: deltaConsult,
      icon: IconStethoscope,
    },
    {
      key: "served",
      label: "Patients served today",
      value: String(ops.summary.patientsServedToday),
      description: "Completed queue tickets",
      icon: IconUserCheck,
    },
    {
      key: "pending",
      label: "Pending requests",
      value: String(ops.summary.pendingRequests),
      description: "Awaiting nurse action",
      icon: IconClipboardList,
    },
    {
      key: "queue",
      label: "Patients in queue",
      value: String(ops.summary.patientsInQueue),
      description: "Currently waiting",
      icon: IconHourglass,
    },
    {
      key: "medical",
      label: "Medical consultations",
      value: String(ops.summary.medicalToday),
      description: "Physician visits today",
      icon: IconStethoscope,
    },
    {
      key: "dental",
      label: "Dental consultations",
      value: String(ops.summary.dentalToday),
      description: "Dentist visits today",
      icon: IconDental,
    },
  ]

  return (
    <div className={adminPageShellClassName("gap-8")}>
      <PageIntro
        title={`Welcome back, ${firstName}`}
        description="Live HSO operations overview — aggregated clinic metrics only."
      />

      {ops.error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {ops.error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <StatCard
              key={card.key}
              className={adminElevatedCardClassName}
              label={card.label}
              value={card.value}
              description={card.description}
              delta={card.delta}
              icon={<Icon className="size-4" aria-hidden />}
            />
          )
        })}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">
            Consultation overview
          </h2>
          <div className="flex flex-wrap gap-1 rounded-lg border p-1">
            {(["daily", "weekly", "monthly"] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={trendMode === mode ? "default" : "ghost"}
                className="capitalize"
                onClick={() => setTrendMode(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
        <ReportChartCard series={trendSeries} elevated />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ReportChartCard
          elevated
          series={{
            key: "patient_type",
            title: "Patient type distribution",
            description: "Patients served today",
            kind: "pie",
            points: ops.patientType,
          }}
        />
        <ReportChartCard
          elevated
          series={{
            key: "utilization",
            title: "Medical vs dental utilization",
            description: "Consultations recorded today",
            kind: "hbar",
            points: ops.utilization,
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">Queue overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            className={adminElevatedCardClassName}
            label="Average waiting time"
            value={`${ops.queue.avgWaitMinutes} min`}
          />
          <StatCard
            className={adminElevatedCardClassName}
            label="Average service time"
            value={`${ops.queue.avgServiceMinutes} min`}
          />
          <StatCard
            className={adminElevatedCardClassName}
            label="Patients waiting"
            value={String(ops.queue.waiting)}
          />
          <StatCard
            className={adminElevatedCardClassName}
            label="Patients served"
            value={String(ops.queue.served)}
          />
        </div>
        <ReportChartCard
          elevated
          series={{
            key: "hourly_queue",
            title: "Queue volume by hour",
            description: ops.queue.peakHourLabel
              ? `Peak around ${ops.queue.peakHourLabel}`
              : "Tickets created today (Manila time)",
            kind: "bar",
            points: ops.queue.hourlyVolume,
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          Consultation request status
        </h2>
        <ReportChartCard
          elevated
          series={{
            key: "request_status",
            title: "Request status volume",
            description: "Mapped from appointment workflow statuses",
            kind: "bar",
            points: ops.requestStatus,
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">
            Clinic staff status
          </h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/admin/user-management/staff" />}
            nativeButton={false}
          >
            Manage staff
          </Button>
        </div>
        {ops.staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No clinic staff accounts found.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ops.staff.map((person) => (
              <Card
                key={person.id}
                className={cn(adminElevatedCardClassName, "shadow-none")}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {person.fullName}
                      </CardTitle>
                      <CardDescription>{roleLabel(person.role)}</CardDescription>
                    </div>
                    <Badge variant={statusVariant(person.status)} className="capitalize">
                      {person.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Last login: {formatLastLogin(person.lastSignInAt)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/admin/reports" />} nativeButton={false}>
            <IconChartBar className="size-4" />
            View Reports
          </Button>
          <Button
            variant="outline"
            render={<Link href="/admin/user-management/staff" />}
            nativeButton={false}
          >
            <IconUsers className="size-4" />
            Manage Clinic Staff
          </Button>
          <Button
            variant="outline"
            render={<Link href="/admin/announcements" />}
            nativeButton={false}
          >
            <IconBellPlus className="size-4" />
            Create Announcement
          </Button>
        </div>
      </section>
    </div>
  )
}
