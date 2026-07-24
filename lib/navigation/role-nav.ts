import type { ComponentType } from "react"
import type { WebRole } from "@/lib/auth/types"
import {
  IconBellRinging,
  IconCalendarEvent,
  IconCalendarTime,
  IconChartBar,
  IconClipboardList,
  IconLayoutGrid,
  IconListCheck,
  IconSettings,
  IconShield,
  IconStethoscope,
  IconUserCog,
  IconUsers,
  IconUserHeart,
} from "@tabler/icons-react"

export type RoleNavItem = {
  title: string
  href: string
  icon?: ComponentType<{ className?: string }>
  children?: RoleNavItem[]
}

export type RoleNavGroup = {
  label?: string
  items: RoleNavItem[]
}

export type RoleNavConfig = {
  groups: RoleNavGroup[]
  footerItems: RoleNavItem[]
  quickActionLabel: string
  quickActionHref?: string
}

export type RoleMeta = {
  title: string
  subtitle: string
  description: string
}

const roleMetaMap: Record<WebRole, RoleMeta> = {
  admin: {
    title: "Admin Dashboard",
    subtitle: "System-wide monitoring and management",
    description:
      "Track operations, manage users, and oversee reports and announcements across the clinic.",
  },
  nurse: {
    title: "Nurse Dashboard",
    subtitle: "Queue and initial assessment operations",
    description:
      "Handle consultation intake, queue updates, vital signs, and initial assessment workflows.",
  },
  physician: {
    title: "Physician Dashboard",
    subtitle: "Consultation and treatment workspace",
    description:
      "Manage appointments, consultations, diagnosis notes, prescriptions, and availability.",
  },
  dentist: {
    title: "Dentist Dashboard",
    subtitle: "Dental consultation management",
    description:
      "Handle dental consultations, findings, procedures, and dental medical certificates.",
  },
}

const roleGroupsByRole: Record<WebRole, RoleNavGroup[]> = {
  admin: [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", href: "/admin/dashboard", icon: IconLayoutGrid },
        { title: "Analytics", href: "/admin/analytics", icon: IconChartBar },
      ],
    },
    {
      label: "Management",
      items: [
        { title: "Reports", href: "/admin/reports", icon: IconChartBar },
        {
          title: "Announcements",
          href: "/admin/announcements",
          icon: IconBellRinging,
        },
        {
          title: "User Management",
          href: "/admin/user-management",
          icon: IconUserCog,
          children: [
            {
              title: "Admins",
              href: "/admin/user-management/admins",
              icon: IconShield,
            },
            {
              title: "Clinic Staff",
              href: "/admin/user-management/staff",
              icon: IconStethoscope,
            },
            {
              title: "Patients",
              href: "/admin/user-management/patients",
              icon: IconUserHeart,
            },
          ],
        },
        { title: "Settings", href: "/admin/settings", icon: IconSettings },
      ],
    },
  ],
  nurse: [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", href: "/nurse/dashboard", icon: IconLayoutGrid },
        { title: "Analytics", href: "/nurse/analytics", icon: IconChartBar },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          title: "Consultation Requests",
          href: "/nurse/consultation-requests",
          icon: IconClipboardList,
        },
        {
          title: "Queue Management",
          href: "/nurse/queue-management",
          icon: IconListCheck,
        },
        {
          title: "Patient Records",
          href: "/nurse/patient-records",
          icon: IconUsers,
        },
        {
          title: "Consultations",
          href: "/nurse/consultations",
          icon: IconStethoscope,
        },
      ],
    },
  ],
  physician: [
    {
      label: "Overview",
      items: [
        {
          title: "Dashboard",
          href: "/physician/dashboard",
          icon: IconLayoutGrid,
        },
      ],
    },
    {
      label: "Clinical",
      items: [
        {
          title: "Appointments",
          href: "/physician/appointments",
          icon: IconCalendarEvent,
        },
        {
          title: "Patients",
          href: "/physician/patients",
          icon: IconUsers,
        },
        {
          title: "Schedule",
          href: "/physician/schedule",
          icon: IconCalendarTime,
        },
      ],
    },
  ],
  dentist: [
    {
      label: "Overview",
      items: [
        {
          title: "Dashboard",
          href: "/dentist/dashboard",
          icon: IconLayoutGrid,
        },
      ],
    },
    {
      label: "Clinical",
      items: [
        {
          title: "Consultations",
          href: "/dentist/dashboard?module=consultations",
          icon: IconStethoscope,
        },
      ],
    },
  ],
}

const footerByRole: Record<WebRole, RoleNavItem[]> = {
  admin: [
    {
      title: "User Management",
      href: "/admin/user-management/staff",
      icon: IconUserCog,
    },
    {
      title: "Announcements",
      href: "/admin/announcements",
      icon: IconBellRinging,
    },
  ],
  nurse: [
    { title: "Reports", href: "/nurse/reports", icon: IconChartBar },
    {
      title: "Announcements",
      href: "/nurse/announcements",
      icon: IconBellRinging,
    },
    { title: "Profile", href: "/nurse/profile", icon: IconSettings },
  ],
  physician: [
    { title: "Reports", href: "/physician/reports", icon: IconChartBar },
    { title: "Profile", href: "/physician/profile", icon: IconSettings },
  ],
  dentist: [
    {
      title: "Reports",
      href: "/dentist/dashboard?module=reports",
      icon: IconChartBar,
    },
    {
      title: "Profile",
      href: "/dentist/dashboard?module=profile",
      icon: IconSettings,
    },
  ],
}

const quickActionByRole: Record<WebRole, { label: string; href: string }> = {
  admin: { label: "Create Announcement", href: "/admin/announcements" },
  nurse: { label: "Register Walk-In", href: "/nurse/consultation-requests" },
  physician: { label: "Start Consultation", href: "/physician/appointments" },
  dentist: { label: "Start Dental Consultation", href: "/dentist/dashboard" },
}

export function getRoleMeta(role: WebRole): RoleMeta {
  return roleMetaMap[role]
}

export function getRoleNavConfig(role: WebRole): RoleNavConfig {
  const quick = quickActionByRole[role]
  return {
    groups: roleGroupsByRole[role],
    footerItems: footerByRole[role],
    quickActionLabel: quick.label,
    quickActionHref: quick.href,
  }
}

function flattenNavItems(items: RoleNavItem[]): RoleNavItem[] {
  return items.flatMap((item) =>
    item.children?.length ? [item, ...flattenNavItems(item.children)] : [item]
  )
}

export function resolveRoleNavItem(
  role: WebRole,
  pathname: string
): RoleNavItem {
  const nav = getRoleNavConfig(role)
  const allItems = flattenNavItems([
    ...nav.groups.flatMap((group) => group.items),
    ...nav.footerItems,
  ])

  if (pathname.includes("/consultation/")) {
    return {
      title: "Consultation",
      href: pathname,
      icon: IconStethoscope,
    }
  }

  const exact = allItems.find((item) => {
    const base = item.href.split("?")[0]
    return pathname === base || pathname === item.href
  })
  if (exact) return exact

  const prefixMatch = allItems
    .filter((item) => {
      const base = item.href.split("?")[0]
      return pathname.startsWith(`${base}/`)
    })
    .sort((a, b) => b.href.length - a.href.length)[0]
  if (prefixMatch) return prefixMatch

  return (
    allItems[0] ?? {
      title: "Dashboard",
      href: roleGroupsByRole[role][0]?.items[0]?.href ?? "/",
      icon: IconLayoutGrid,
    }
  )
}
