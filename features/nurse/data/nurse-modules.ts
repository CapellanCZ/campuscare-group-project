export type NurseModuleKey =
  | "dashboard"
  | "consultation-requests"
  | "queue-management"
  | "patient-records"
  | "consultations"
  | "reports"
  | "announcements"
  | "profile"

export type NurseModuleSeed = {
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
  nextActions: string[]
}

const emptyMetrics = [
  { title: "Pending requests", value: "0", hint: "Live data on /nurse" },
  { title: "Waiting", value: "0", hint: "Live data on /nurse" },
  { title: "Need intake", value: "0", hint: "Live data on /nurse" },
  { title: "Served today", value: "0", hint: "Live data on /nurse" },
]

/** Legacy route chrome only — no invented clinic metrics. */
export const nurseModuleSeeds: Record<NurseModuleKey, NurseModuleSeed> = {
  dashboard: {
    title: "Nurse Dashboard",
    subtitle: "Consultation intake and queue operations",
    description:
      "Use the live /nurse dashboard for queue and triage. This legacy page no longer shows sample metrics.",
    metrics: emptyMetrics,
    rows: [],
    nextActions: ["Open /nurse", "Open queue management", "Open requests"],
  },
  "consultation-requests": {
    title: "Consultation requests",
    subtitle: "Request triage",
    description: "Open /nurse/consultation-requests for live requests.",
    metrics: emptyMetrics,
    rows: [],
    nextActions: ["Open consultation requests"],
  },
  "queue-management": {
    title: "Queue management",
    subtitle: "Nurse station queue",
    description: "Open /nurse/queue-management for the live board.",
    metrics: emptyMetrics,
    rows: [],
    nextActions: ["Open queue management"],
  },
  "patient-records": {
    title: "Patient records",
    subtitle: "Directory",
    description: "Open /nurse/patient-records for live records.",
    metrics: emptyMetrics,
    rows: [],
    nextActions: ["Open patient records"],
  },
  consultations: {
    title: "Consultations",
    subtitle: "Visit overview",
    description: "Open /nurse/consultations for live visits.",
    metrics: emptyMetrics,
    rows: [],
    nextActions: ["Open consultations"],
  },
  reports: {
    title: "Reports",
    subtitle: "Clinic analytics",
    description: "Open /nurse/reports for live analytics.",
    metrics: emptyMetrics,
    rows: [],
    nextActions: ["Open reports"],
  },
  announcements: {
    title: "Announcements",
    subtitle: "Clinic notices",
    description: "Open /nurse/announcements for live notices.",
    metrics: emptyMetrics,
    rows: [],
    nextActions: ["Open announcements"],
  },
  profile: {
    title: "Profile",
    subtitle: "Your account",
    description: "Open /nurse/profile for your live profile.",
    metrics: emptyMetrics,
    rows: [],
    nextActions: ["Open profile"],
  },
}
