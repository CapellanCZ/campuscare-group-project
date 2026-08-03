import type { WebRole } from "@/lib/auth/types"

export type RoleSummaryMetric = {
  title: string
  value: string
  hint: string
}

export type RoleDashboardSeed = {
  metrics: RoleSummaryMetric[]
  quickModules: string[]
  rows: Array<{
    module: string
    status: string
    owner: string
    updatedAt: string
  }>
}

const emptyMetrics: RoleSummaryMetric[] = [
  { title: "Activity", value: "0", hint: "Use the live role dashboard" },
  { title: "Queue", value: "0", hint: "Use the live role dashboard" },
  { title: "Requests", value: "0", hint: "Use the live role dashboard" },
  { title: "Reports", value: "0", hint: "Use the live role dashboard" },
]

/** Legacy seed chrome only — live role homes use StaffHomePage / RoleDashboard. */
export const roleDashboardSeed: Record<WebRole, RoleDashboardSeed> = {
  admin: {
    metrics: emptyMetrics,
    quickModules: ["Reports", "Announcements", "User Management", "Settings"],
    rows: [],
  },
  nurse: {
    metrics: emptyMetrics,
    quickModules: [
      "Consultation Requests",
      "Queue Management",
      "Patient Records",
      "Announcements",
    ],
    rows: [],
  },
  physician: {
    metrics: emptyMetrics,
    quickModules: [
      "Appointments",
      "Consultations",
      "Patients",
      "Certificates",
    ],
    rows: [],
  },
  dentist: {
    metrics: emptyMetrics,
    quickModules: ["Queue", "Consultations", "Patients", "Announcements"],
    rows: [],
  },
  queue_display: {
    metrics: emptyMetrics,
    quickModules: ["Queue display"],
    rows: [],
  },
}
