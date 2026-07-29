import type { ReactNode } from "react"
import {
  IconCalendarEvent,
  IconCalendarTime,
  IconCertificate,
  IconChecklist,
  IconClipboardHeart,
  IconHelpCircle,
  IconLayoutDashboard,
  IconReportAnalytics,
  IconScreenShare,
  IconSettings,
  IconSpeakerphone,
  IconUsers,
  IconUserHeart,
} from "@tabler/icons-react"

import type { ClinicDesignation } from "@/lib/auth/types"
import {
  buildStaffFooterNav,
  buildStaffNavGroups,
  filterNavGroupsForRole,
  flattenNavItems,
  isNavItemActive,
  resolveStaffNavItem,
  type StaffNavGroupDef,
  type StaffNavIcon,
  type StaffNavItemDef,
} from "@/lib/navigation/staff-nav"

export type SidebarNavItem = {
  title: string
  path?: string
  icon?: ReactNode
  isActive?: boolean
  subItems?: SidebarNavItem[]
}

export type SidebarNavGroup = {
  label?: string
  items: SidebarNavItem[]
}

const navIcons: Record<StaffNavIcon, ReactNode> = {
  dashboard: <IconLayoutDashboard />,
  requests: <IconCalendarEvent />,
  queue: <IconChecklist />,
  display: <IconScreenShare />,
  patients: <IconUserHeart />,
  consultations: <IconClipboardHeart />,
  certificates: <IconCertificate />,
  reports: <IconReportAnalytics />,
  announcements: <IconSpeakerphone />,
  users: <IconUsers />,
  settings: <IconSettings />,
  help: <IconHelpCircle />,
  schedule: <IconCalendarTime />,
}

function toSidebarItem(
  item: StaffNavItemDef,
  pathname?: string
): SidebarNavItem {
  return {
    title: item.title,
    path: item.path,
    icon: navIcons[item.icon],
    isActive: pathname ? isNavItemActive(pathname, item) : undefined,
  }
}

export function getNavGroupsForRole(
  designation: ClinicDesignation,
  pathname?: string
): SidebarNavGroup[] {
  return filterNavGroupsForRole(
    designation,
    buildStaffNavGroups(designation)
  ).map((group) => ({
    label: group.label,
    items: group.items.map((item) => toSidebarItem(item, pathname)),
  }))
}

export function getFooterNavLinks(
  designation: ClinicDesignation = "admin"
): SidebarNavItem[] {
  return buildStaffFooterNav(designation).map((item) => toSidebarItem(item))
}

/** @deprecated Prefer getNavGroupsForRole — kept for any remaining static imports */
export const navGroups: SidebarNavGroup[] = getNavGroupsForRole("admin")

export const footerNavLinks: SidebarNavItem[] = getFooterNavLinks("admin")

export const navLinks: SidebarNavItem[] = [
  ...navGroups.flatMap((group) =>
    group.items.flatMap((item) =>
      item.subItems?.length ? [item, ...item.subItems] : [item]
    )
  ),
  ...footerNavLinks,
]

export function resolveActiveNav(
  pathname: string,
  designation?: ClinicDesignation
): SidebarNavItem | undefined {
  const role = designation ?? "admin"
  const groups = filterNavGroupsForRole(role, buildStaffNavGroups(role))
  const footer = buildStaffFooterNav(role)
  const items = flattenNavItems(groups as StaffNavGroupDef[], footer)
  const match = resolveStaffNavItem(pathname, items)
  return match ? toSidebarItem(match, pathname) : undefined
}
