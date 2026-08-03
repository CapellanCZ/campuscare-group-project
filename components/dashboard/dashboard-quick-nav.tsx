"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import {
  IconBellRinging,
  IconCalendarEvent,
  IconChartBar,
  IconClipboardList,
  IconListCheck,
  IconStethoscope,
  IconUserCog,
  IconUsers,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import type { ClinicDesignation } from "@/lib/auth/types"

type QuickNavItem = {
  label: string
  href: string
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
}

const QUICK_NAV: Record<
  Exclude<ClinicDesignation, "queue_display">,
  QuickNavItem[]
> = {
  admin: [
    {
      label: "Queue",
      href: "/admin/queue",
      icon: IconListCheck,
    },
    {
      label: "Announcements",
      href: "/admin/announcements",
      icon: IconBellRinging,
    },
    {
      label: "Staff",
      href: "/admin/user-management/staff",
      icon: IconUserCog,
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: IconChartBar,
    },
  ],
  nurse: [
    {
      label: "Requests",
      href: "/nurse/consultation-requests",
      icon: IconClipboardList,
    },
    {
      label: "Queue",
      href: "/nurse/queue-management",
      icon: IconListCheck,
    },
    {
      label: "Patients",
      href: "/nurse/patient-records",
      icon: IconUsers,
    },
    {
      label: "Announcements",
      href: "/nurse/announcements",
      icon: IconBellRinging,
    },
  ],
  physician: [
    {
      label: "Appointments",
      href: "/physician/appointments",
      icon: IconCalendarEvent,
    },
    {
      label: "Queue",
      href: "/physician/queue",
      icon: IconListCheck,
    },
    {
      label: "Patients",
      href: "/physician/patients",
      icon: IconUsers,
    },
    {
      label: "Consultations",
      href: "/physician/consultations",
      icon: IconStethoscope,
    },
  ],
  dentist: [
    {
      label: "Queue",
      href: "/dentist/queue",
      icon: IconListCheck,
    },
    {
      label: "Patients",
      href: "/dentist/patients",
      icon: IconUsers,
    },
    {
      label: "Consultations",
      href: "/dentist/consultations",
      icon: IconStethoscope,
    },
    {
      label: "Announcements",
      href: "/dentist/announcements",
      icon: IconBellRinging,
    },
  ],
}

export function DashboardQuickNav({
  designation,
}: {
  designation: ClinicDesignation
}) {
  if (designation === "queue_display") return null
  const items = QUICK_NAV[designation]

  return (
    <nav
      aria-label="Quick links"
      className="flex min-w-0 flex-wrap items-center gap-2"
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Button
            key={item.href}
            size="sm"
            variant="outline"
            className="bg-background"
            render={<Link href={item.href} />}
            nativeButton={false}
          >
            <Icon className="size-3.5" aria-hidden />
            {item.label}
          </Button>
        )
      })}
    </nav>
  )
}
