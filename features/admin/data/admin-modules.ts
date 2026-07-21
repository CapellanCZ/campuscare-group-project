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

export const adminModuleSeeds: Record<AdminModuleKey, AdminModuleSeed> = {
  dashboard: {
    title: "Admin Dashboard",
    subtitle: "Operations and governance overview",
    description:
      "Monitor key clinic activity, announcement throughput, and role usage from a centralized admin workspace.",
    metrics: [
      { title: "Open Requests", value: "34", hint: "Pending assignment" },
      { title: "Active Staff", value: "28", hint: "Across all roles" },
      { title: "Announcements", value: "8", hint: "Published this month" },
      { title: "Reports", value: "42", hint: "Generated in 30 days" },
    ],
    rows: [
      { module: "Queue Oversight", status: "Healthy", owner: "System", updatedAt: "2m ago" },
      { module: "Reports Export", status: "Stable", owner: "Admin", updatedAt: "15m ago" },
      { module: "User Audit", status: "In review", owner: "Security", updatedAt: "1h ago" },
    ],
  },
  reports: {
    title: "Reports",
    subtitle: "Performance and utilization analytics",
    description:
      "Review consultation volume, certification activity, and queue performance from consolidated reporting views.",
    metrics: [
      { title: "Consultation Reports", value: "17", hint: "Generated today" },
      { title: "Certificate Reports", value: "9", hint: "Generated today" },
      { title: "Export Jobs", value: "5", hint: "PDF and Excel queue" },
      { title: "Avg Build Time", value: "12s", hint: "Report preparation latency" },
    ],
    rows: [
      { module: "Consultation Summary", status: "Ready", owner: "Analytics", updatedAt: "10m ago" },
      { module: "Queue Throughput", status: "Ready", owner: "Analytics", updatedAt: "18m ago" },
      { module: "Certificate Breakdown", status: "Refreshing", owner: "System", updatedAt: "1m ago" },
    ],
  },
  announcements: {
    title: "Announcements",
    subtitle: "Content publishing and scheduling",
    description:
      "Create, review, and schedule official health announcements for internal publishing workflows.",
    metrics: [
      { title: "Drafts", value: "6", hint: "Awaiting review" },
      { title: "Scheduled", value: "4", hint: "Queued for release" },
      { title: "Published", value: "21", hint: "Last 30 days" },
      { title: "Archived", value: "13", hint: "Historical notices" },
    ],
    rows: [
      { module: "Flu Vaccination Notice", status: "Published", owner: "Admin", updatedAt: "30m ago" },
      { module: "Clinic Hours Advisory", status: "Scheduled", owner: "Admin", updatedAt: "2h ago" },
      { module: "System Maintenance", status: "Draft", owner: "Comms", updatedAt: "5h ago" },
    ],
  },
  "user-management": {
    title: "User Management",
    subtitle: "Role assignments and account controls",
    description:
      "Manage staff accounts, role assignments, activation status, and password reset operations.",
    metrics: [
      { title: "Total Staff", value: "28", hint: "Enabled user accounts" },
      { title: "Pending Invites", value: "3", hint: "Awaiting acceptance" },
      { title: "Role Changes", value: "2", hint: "Today" },
      { title: "Disabled Accounts", value: "1", hint: "Requires review" },
    ],
    rows: [
      { module: "Nurse Assignment", status: "Updated", owner: "Admin", updatedAt: "8m ago" },
      { module: "Physician Access", status: "Pending", owner: "Admin", updatedAt: "42m ago" },
      { module: "Dentist Profile", status: "Active", owner: "Admin", updatedAt: "2h ago" },
    ],
  },
  settings: {
    title: "Settings",
    subtitle: "Clinic and system configuration",
    description:
      "Configure clinic preferences, queue policy, notification defaults, and security controls.",
    metrics: [
      { title: "Config Sections", value: "5", hint: "Editable modules" },
      { title: "Security Alerts", value: "0", hint: "No critical warnings" },
      { title: "Notification Rules", value: "12", hint: "Active delivery rules" },
      { title: "Audit Events", value: "67", hint: "Last 7 days" },
    ],
    rows: [
      { module: "Queue Policy", status: "Configured", owner: "Admin", updatedAt: "20m ago" },
      { module: "Notification Channels", status: "Configured", owner: "Admin", updatedAt: "50m ago" },
      { module: "Security Preferences", status: "Review", owner: "Security", updatedAt: "1d ago" },
    ],
  },
}
