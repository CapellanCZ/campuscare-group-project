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

const baseRows = [
  {
    module: "Consultation Requests",
    status: "In review",
    owner: "HSO Team",
    updatedAt: "5 minutes ago",
  },
  {
    module: "Queue Management",
    status: "Live",
    owner: "Front Desk",
    updatedAt: "2 minutes ago",
  },
  {
    module: "Patient Records",
    status: "Updated",
    owner: "Records Unit",
    updatedAt: "1 hour ago",
  },
]

export const roleDashboardSeed: Record<WebRole, RoleDashboardSeed> = {
  admin: {
    metrics: [
      { title: "Active Staff", value: "28", hint: "Across all role groups" },
      { title: "Open Requests", value: "34", hint: "Awaiting assignment" },
      { title: "Published Announcements", value: "8", hint: "This month" },
      { title: "Reports Generated", value: "42", hint: "Last 30 days" },
    ],
    quickModules: [
      "Reports",
      "Announcements",
      "User Management",
      "Settings",
    ],
    rows: baseRows,
  },
  nurse: {
    metrics: [
      { title: "Queue Today", value: "21", hint: "Patients checked in" },
      { title: "Initial Assessments", value: "14", hint: "Completed today" },
      { title: "Walk-Ins", value: "6", hint: "Registered this shift" },
      { title: "Pending Requests", value: "9", hint: "Need triage action" },
    ],
    quickModules: [
      "Consultation Requests",
      "Queue Management",
      "Patient Records",
      "Initial Assessment",
    ],
    rows: baseRows,
  },
  physician: {
    metrics: [
      { title: "Consultations", value: "16", hint: "Completed this week" },
      { title: "Certificates Issued", value: "11", hint: "Medical certificates" },
      { title: "Follow-Ups", value: "7", hint: "Scheduled visits" },
      { title: "Pending Cases", value: "5", hint: "Awaiting review" },
    ],
    quickModules: [
      "Consultations",
      "Medical Certificates",
      "Patient Records",
      "Reports",
    ],
    rows: baseRows,
  },
  dentist: {
    metrics: [
      { title: "Dental Consultations", value: "13", hint: "Completed this week" },
      { title: "Dental Certificates", value: "7", hint: "Generated this week" },
      { title: "Procedure Notes", value: "10", hint: "Recorded today" },
      { title: "Pending Cases", value: "4", hint: "For follow-up" },
    ],
    quickModules: [
      "Consultations",
      "Dental Certificates",
      "Patient Records",
      "Reports",
    ],
    rows: baseRows,
  },
}
