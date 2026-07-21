import type { ComponentType } from "react"
import type { WebRole } from "@/lib/auth/types"
import {
  IconBellRinging,
  IconCertificate,
  IconChartBar,
  IconClipboardList,
  IconLayoutGrid,
  IconListCheck,
  IconSettings,
  IconStethoscope,
  IconUserCog,
  IconUsers,
} from "@tabler/icons-react"

export type RoleNavItem = {
  title: string
  href: string
  icon?: ComponentType<{ className?: string }>
}

export type RoleNavGroup = {
  label?: string
  items: RoleNavItem[]
}

export type RoleNavConfig = {
  groups: RoleNavGroup[]
  footerItems: RoleNavItem[]
  quickActionLabel: string
}

export type RoleMeta = {
  title: string
  subtitle: string
  description: string
}

const sharedGroups: RoleNavGroup[] = [
  {
    items: [{ title: "Dashboard", href: "", icon: IconLayoutGrid }],
  },
  {
    label: "Operations",
    items: [
      { title: "Consultation Requests", href: "", icon: IconClipboardList },
      { title: "Queue Management", href: "", icon: IconListCheck },
      { title: "Patient Records", href: "", icon: IconUsers },
      { title: "Consultations", href: "", icon: IconStethoscope },
    ],
  },
]

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
      "Manage consultations, diagnosis notes, treatment plans, and medical certificate generation.",
  },
  dentist: {
    title: "Dentist Dashboard",
    subtitle: "Dental consultation management",
    description:
      "Handle dental consultations, findings, procedures, and dental medical certificates.",
  },
}

const dashboardBasePath: Record<WebRole, string> = {
  admin: "/admin/dashboard",
  nurse: "/nurse/dashboard",
  physician: "/physician/dashboard",
  dentist: "/dentist/dashboard",
}

function mapGroupHrefs(role: WebRole, groups: RoleNavGroup[]): RoleNavGroup[] {
  const base = dashboardBasePath[role]
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      href:
        item.title === "Dashboard"
          ? base
          : `${base}?module=${encodeURIComponent(item.title.toLowerCase())}`,
    })),
  }))
}

const roleGroupsByRole: Record<WebRole, RoleNavGroup[]> = {
  admin: [
    {
      items: [{ title: "Dashboard", href: "/admin/dashboard", icon: IconLayoutGrid }],
    },
    {
      label: "Management",
      items: [
        { title: "Reports", href: "/admin/reports", icon: IconChartBar },
        { title: "Announcements", href: "/admin/announcements", icon: IconBellRinging },
        { title: "User Management", href: "/admin/user-management", icon: IconUserCog },
        { title: "Settings", href: "/admin/settings", icon: IconSettings },
      ],
    },
  ],
  nurse: [
    {
      items: [{ title: "Dashboard", href: "/nurse/dashboard", icon: IconLayoutGrid }],
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
  physician: sharedGroups,
  dentist: sharedGroups,
}

const footerByRole: Record<WebRole, RoleNavItem[]> = {
  admin: [
    { title: "Reports", href: "/admin/reports", icon: IconChartBar },
    { title: "Announcements", href: "/admin/announcements", icon: IconBellRinging },
    { title: "User Management", href: "/admin/user-management", icon: IconUserCog },
  ],
  nurse: [
    { title: "Reports", href: "/nurse/reports", icon: IconChartBar },
    { title: "Announcements", href: "/nurse/announcements", icon: IconBellRinging },
    { title: "Profile", href: "/nurse/profile", icon: IconSettings },
  ],
  physician: [
    { title: "Medical Certificates", href: "/physician/dashboard?module=medical-certificates", icon: IconCertificate },
    { title: "Reports", href: "/physician/dashboard?module=reports", icon: IconChartBar },
    { title: "Profile", href: "/physician/dashboard?module=profile", icon: IconSettings },
  ],
  dentist: [
    { title: "Dental Certificates", href: "/dentist/dashboard?module=medical-certificates", icon: IconCertificate },
    { title: "Reports", href: "/dentist/dashboard?module=reports", icon: IconChartBar },
    { title: "Profile", href: "/dentist/dashboard?module=profile", icon: IconSettings },
  ],
}

const quickActionByRole: Record<WebRole, string> = {
  admin: "Create Announcement",
  nurse: "Register Walk-In",
  physician: "Start Consultation",
  dentist: "Start Dental Consultation",
}

export function getRoleMeta(role: WebRole): RoleMeta {
  return roleMetaMap[role]
}

export function getRoleNavConfig(role: WebRole): RoleNavConfig {
  const groups =
    role === "admin" || role === "nurse"
      ? roleGroupsByRole[role]
      : mapGroupHrefs(role, roleGroupsByRole[role])

  return {
    groups,
    footerItems: footerByRole[role],
    quickActionLabel: quickActionByRole[role],
  }
}
