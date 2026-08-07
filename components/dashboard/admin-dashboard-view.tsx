"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import {
  IconBellRinging,
  IconCertificate,
  IconChartBar,
  IconStethoscope,
  IconUsers,
} from "@tabler/icons-react"

import { PageIntro } from "@/components/layout/panel-frame"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import {
  adminElevatedCardClassName,
  adminPageShellClassName,
} from "@/features/admin/lib/admin-surface"
import type { StaffAccess } from "@/lib/auth/types"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type { DashboardKpis } from "@/lib/health/types"

const KPI_ICONS: Record<
  string,
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  staff: IconUsers,
  announcements: IconBellRinging,
  completed: IconStethoscope,
  certs: IconCertificate,
}

function kpiCard(kpis: DashboardKpis, key: string) {
  return kpis.cards.find((c) => c.key === key)
}

function SectionHeader({
  title,
  href,
  icon: Icon,
}: {
  title: string
  href: string
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <h2 className="truncate text-base font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      <Button
        size="sm"
        variant="outline"
        render={<Link href={href} />}
        nativeButton={false}
      >
        Open
      </Button>
    </div>
  )
}

export function AdminDashboardView({
  access,
  kpis,
  summary,
}: {
  access: StaffAccess
  kpis: DashboardKpis
  summary: RoleDashboardSummary
}) {
  const firstName = access.fullName.split(" ")[0] || access.fullName
  const staff = summary.staffSummary
  const clinicStaffTotal =
    (staff?.nurses ?? 0) + (staff?.physicians ?? 0) + (staff?.dentists ?? 0)

  const reportCards = [
    kpiCard(kpis, "completed"),
    kpiCard(kpis, "certs"),
    kpiCard(kpis, "announcements"),
  ].filter((c): c is NonNullable<typeof c> => Boolean(c))

  const announcementStats = summary.announcements.stats ?? {
    published: summary.announcements.publishedCount,
    scheduled: 0,
    drafts: 0,
    total: summary.announcements.publishedCount,
  }

  /** Same four cards as Announcements tab (Visible Now / Upcoming / Unpublished / All). */
  const announcementCards = [
    {
      key: "published",
      label: "Published",
      value: String(announcementStats.published),
      description: "Visible now",
    },
    {
      key: "scheduled",
      label: "Scheduled",
      value: String(announcementStats.scheduled),
      description: "Upcoming",
    },
    {
      key: "draft",
      label: "Drafts",
      value: String(announcementStats.drafts),
      description: "Unpublished",
    },
    {
      key: "total",
      label: "Total",
      value: String(announcementStats.total),
      description: "All notices",
    },
  ]

  return (
    <div className={adminPageShellClassName("gap-8")}>
      <PageIntro title={`Welcome back, ${firstName}`} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.cards.slice(0, 4).map((card) => {
          const Icon = KPI_ICONS[card.key] ?? IconUsers
          return (
            <StatCard
              key={card.key}
              className={adminElevatedCardClassName}
              label={card.label}
              value={card.value}
              description={card.description}
              icon={<Icon className="size-4" aria-hidden />}
            />
          )
        })}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Reports"
          href="/admin/reports"
          icon={IconChartBar}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {reportCards.map((card) => {
            const Icon = KPI_ICONS[card.key] ?? IconChartBar
            return (
              <StatCard
                key={`reports-${card.key}`}
                className={adminElevatedCardClassName}
                label={card.label}
                value={card.value}
                description={card.description}
                href="/admin/reports"
                icon={<Icon className="size-4" aria-hidden />}
              />
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Announcements"
          href="/admin/announcements"
          icon={IconBellRinging}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {announcementCards.map((card) => (
            <StatCard
              key={`announcements-${card.key}`}
              className={adminElevatedCardClassName}
              label={card.label}
              value={card.value}
              description={card.description}
              href="/admin/announcements"
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Clinic Staff"
          href="/admin/user-management/staff"
          icon={IconStethoscope}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            className={adminElevatedCardClassName}
            label="Staff accounts"
            value={String(clinicStaffTotal)}
            description="Nurses, physicians, dentists"
            href="/admin/user-management/staff"
            icon={<IconStethoscope className="size-4" aria-hidden />}
          />
          <StatCard
            className={adminElevatedCardClassName}
            label="Active"
            value={String(staff?.active ?? 0)}
            description="Signed in across roles"
            href="/admin/user-management/staff"
          />
          <StatCard
            className={adminElevatedCardClassName}
            label="Invited"
            value={String(staff?.invited ?? 0)}
            description="Invite pending"
            href="/admin/user-management/staff"
          />
          <StatCard
            className={adminElevatedCardClassName}
            label="By role"
            value={`${staff?.nurses ?? 0} / ${staff?.physicians ?? 0} / ${staff?.dentists ?? 0}`}
            description="Nurse · Physician · Dentist"
            href="/admin/user-management/staff"
          />
        </div>
      </section>
    </div>
  )
}
