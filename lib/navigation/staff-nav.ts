import type { ClinicDesignation } from "@/lib/auth/types"
import {
  canViewModule,
  type NavModule,
} from "@/lib/auth/permissions"
import {
  staffBasePath,
  stripStaffBasePath,
} from "@/lib/auth/home-path"

export type StaffNavIcon =
  | "dashboard"
  | "requests"
  | "queue"
  | "display"
  | "patients"
  | "consultations"
  | "certificates"
  | "reports"
  | "announcements"
  | "users"
  | "settings"
  | "help"
  | "schedule"

export type StaffNavItemDef = {
  id: string
  title: string
  path: string
  icon: StaffNavIcon
  /** When set, item is shown only if the role can view this module */
  module?: NavModule
  /**
   * Extra path prefixes that should mark this item active
   * (in addition to an exact `path` match).
   */
  matchPrefixes?: string[]
}

export type StaffNavGroupDef = {
  id: string
  label?: string
  items: StaffNavItemDef[]
}

type NavItemTemplate = {
  id: string
  title: string
  /** Path relative to role base, e.g. "" or "/queue" */
  suffix: string
  icon: StaffNavIcon
  module?: NavModule
}

type NavGroupTemplate = {
  id: string
  label?: string
  items: NavItemTemplate[]
}

/**
 * CampusCare staff sidebar — contents driven by the role permission matrices.
 * Feature-level actions (approve, call next, etc.) are gated in page UI via
 * `lib/auth/permissions`, not by hiding whole modules (except User Management).
 */
const staffNavGroupTemplates: NavGroupTemplate[] = [
  {
    id: "products",
    label: "Products",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        suffix: "",
        icon: "dashboard",
        module: "dashboard",
      },
      {
        id: "reports",
        title: "Reports",
        suffix: "/reports",
        icon: "reports",
        module: "reports",
      },
      {
        id: "announcements",
        title: "Announcements",
        suffix: "/announcements",
        icon: "announcements",
        module: "announcements",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        id: "consultation-requests",
        title: "Consultation Requests",
        suffix: "/requests",
        icon: "requests",
        module: "consultation_requests",
      },
      {
        id: "queue",
        title: "Queue Management",
        suffix: "/queue",
        icon: "queue",
        module: "queue_management",
      },
    ],
  },
  {
    id: "clinical",
    label: "Clinical",
    items: [
      {
        id: "patients",
        title: "Patient Records",
        suffix: "/patients",
        icon: "patients",
        module: "patient_records",
      },
      {
        id: "consultations",
        title: "Consultations",
        suffix: "/consultations",
        icon: "consultations",
        module: "consultations",
      },
      {
        id: "certificates",
        title: "Medical Documents",
        suffix: "/certificates",
        icon: "certificates",
        module: "medical_certificates",
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      {
        id: "users",
        title: "User Management",
        suffix: "/user-management/staff",
        icon: "users",
        module: "user_management",
      },
    ],
  },
]

function resolveItemPath(
  designation: ClinicDesignation,
  suffix: string
): string {
  // Absolute app paths (public display) bypass role base.
  if (suffix.startsWith("/queue-management")) {
    return suffix
  }
  return `${staffBasePath(designation)}${suffix}`
}

export function buildStaffNavGroups(
  designation: ClinicDesignation
): StaffNavGroupDef[] {
  // Admin is ops-only: no clinical sidebar groups.
  if (designation === "admin") {
    return [
      {
        id: "overview",
        label: "Overview",
        items: [
          {
            id: "dashboard",
            title: "Dashboard",
            path: "/admin",
            icon: "dashboard",
            module: "dashboard",
            matchPrefixes: ["/admin/dashboard"],
          },
          {
            id: "reports",
            title: "Reports",
            path: "/admin/reports",
            icon: "reports",
            module: "reports",
            matchPrefixes: ["/admin/reports", "/admin/analytics"],
          },
        ],
      },
      {
        id: "management",
        label: "Management",
        items: [
          {
            id: "announcements",
            title: "Announcements",
            path: "/admin/announcements",
            icon: "announcements",
            module: "announcements",
            matchPrefixes: ["/admin/announcements"],
          },
          {
            id: "staff",
            title: "Clinic Staff",
            path: "/admin/user-management/staff",
            icon: "users",
            module: "user_management",
            matchPrefixes: [
              "/admin/user-management/staff",
              "/admin/user-management",
            ],
          },
        ],
      },
    ]
  }

  const groups = staffNavGroupTemplates.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => {
      const path = resolveItemPath(designation, item.suffix)
      return {
        id: item.id,
        title: item.title,
        path,
        icon: item.icon,
        module: item.module,
        matchPrefixes:
          item.suffix && !item.suffix.startsWith("/queue-management")
            ? [path]
            : undefined,
      }
    }),
  }))

  if (designation === "physician") {
    const products = groups.find((g) => g.id === "products")
    const reportsItem = products?.items.find((item) => item.id === "reports")
    if (reportsItem) {
      reportsItem.title = "Reports and Analytics"
    }
  }

  return groups
}

/** @deprecated Prefer buildStaffNavGroups(designation) */
export const staffNavGroups: StaffNavGroupDef[] = buildStaffNavGroups("admin")

export function buildStaffFooterNav(
  _designation: ClinicDesignation
): StaffNavItemDef[] {
  return []
}

/** @deprecated Prefer buildStaffFooterNav(designation) */
export const staffFooterNav: StaffNavItemDef[] = buildStaffFooterNav("admin")

export function filterNavGroupsForRole(
  designation: ClinicDesignation,
  groups: StaffNavGroupDef[] = buildStaffNavGroups(designation)
): StaffNavGroupDef[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Public Display gets its own login later — hide from physician sidebar.
        if (item.id === "display" && designation === "physician") {
          return false
        }
        if (!item.module) return true
        return canViewModule(designation, item.module)
      }),
    }))
    .filter((group) => group.items.length > 0)
}

export function flattenNavItems(
  groups: StaffNavGroupDef[],
  footer: StaffNavItemDef[] = staffFooterNav
): StaffNavItemDef[] {
  return [...groups.flatMap((group) => group.items), ...footer]
}

export function resolveStaffNavItem(
  pathname: string,
  items: StaffNavItemDef[]
): StaffNavItemDef | undefined {
  const exact = items.find((item) => item.path === pathname)
  if (exact) return exact

  const homePaths = new Set(
    items.filter((item) => item.id === "dashboard").map((item) => item.path)
  )

  const ranked = items
    .filter((item) => {
      if (homePaths.has(item.path)) return false
      if (pathname === item.path) return true
      return (
        item.matchPrefixes?.some(
          (prefix) =>
            pathname === prefix || pathname.startsWith(`${prefix}/`)
        ) ?? false
      )
    })
    .sort((a, b) => b.path.length - a.path.length)

  if (ranked[0]) return ranked[0]

  const relative = stripStaffBasePath(pathname)
  if (relative === "" || relative === "/") {
    return items.find((item) => item.id === "dashboard")
  }

  return undefined
}

export function isNavItemActive(
  pathname: string,
  item: StaffNavItemDef
): boolean {
  if (item.id === "dashboard") {
    return pathname === item.path
  }
  if (pathname === item.path) return true
  return (
    item.matchPrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    ) ?? false
  )
}

/** Relative route suffix → module for page-level guards */
const routeModuleBySuffix: { suffix: string; module: NavModule }[] = [
  { suffix: "/requests", module: "consultation_requests" },
  { suffix: "/queue", module: "queue_management" },
  { suffix: "/patients", module: "patient_records" },
  { suffix: "/consultations", module: "consultations" },
  { suffix: "/certificates", module: "medical_certificates" },
  { suffix: "/reports", module: "reports" },
  { suffix: "/announcements", module: "announcements" },
  { suffix: "/user-management", module: "user_management" },
  { suffix: "/users", module: "user_management" },
  { suffix: "/settings", module: "settings" },
  { suffix: "", module: "dashboard" },
]

export function moduleForPath(pathname: string): NavModule | null {
  if (
    pathname === "/queue-management/display" ||
    pathname.startsWith("/queue-management/display/")
  ) {
    return "queue_management"
  }

  const relative = stripStaffBasePath(pathname)
  const match = routeModuleBySuffix
    .slice()
    .sort((a, b) => b.suffix.length - a.suffix.length)
    .find(
      (entry) =>
        relative === entry.suffix ||
        relative.startsWith(`${entry.suffix}/`)
    )
  return match?.module ?? null
}

export function canAccessPath(
  designation: ClinicDesignation,
  pathname: string
): boolean {
  const module = moduleForPath(pathname)
  if (!module) return true
  return canViewModule(designation, module)
}
