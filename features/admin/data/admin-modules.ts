export type AdminModuleKey =
  | "dashboard"
  | "reports"
  | "announcements"
  | "user-management"
  | "settings"

export type AdminModuleSeed = {
  title: string
  subtitle: string
  description: string
  metrics: Array<{ title: string; value: string; hint: string }>
  rows: Array<{
    module: string
    status: string
    owner: string
    updatedAt: string
  }>
}

const emptyMetrics = [
  { title: "Open Requests", value: "0", hint: "Live data on /admin" },
  { title: "Active Staff", value: "0", hint: "Live data on /admin" },
  { title: "Announcements", value: "0", hint: "Live data on /admin" },
  { title: "Queue load", value: "0", hint: "Live data on /admin" },
]

/** Legacy route chrome only — no invented clinic metrics. */
export const adminModuleSeeds: Record<AdminModuleKey, AdminModuleSeed> = {
  dashboard: {
    title: "Admin Dashboard",
    subtitle: "Operations and governance overview",
    description:
      "Use the live /admin dashboard for clinic activity. This legacy page no longer shows sample metrics.",
    metrics: emptyMetrics,
    rows: [],
  },
  reports: {
    title: "Reports",
    subtitle: "Clinic analytics",
    description: "Open /admin/reports for live clinic analytics.",
    metrics: emptyMetrics,
    rows: [],
  },
  announcements: {
    title: "Announcements",
    subtitle: "Clinic notices",
    description: "Open /admin/announcements for live notices.",
    metrics: emptyMetrics,
    rows: [],
  },
  "user-management": {
    title: "User management",
    subtitle: "Staff accounts",
    description: "Open /admin/user-management for live staff accounts.",
    metrics: emptyMetrics,
    rows: [],
  },
  settings: {
    title: "Settings",
    subtitle: "Clinic configuration",
    description: "Open /admin/settings for live configuration.",
    metrics: emptyMetrics,
    rows: [],
  },
}
