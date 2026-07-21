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

export const nurseModuleSeeds: Record<NurseModuleKey, NurseModuleSeed> = {
  dashboard: {
    title: "Nurse Dashboard",
    subtitle: "Consultation intake and queue operations",
    description:
      "Oversee consultation requests, queue activity, and initial assessments to keep clinic operations moving efficiently.",
    metrics: [
      { title: "Queue Today", value: "21", hint: "Checked-in patients" },
      { title: "Pending Requests", value: "9", hint: "Awaiting triage" },
      { title: "Initial Assessments", value: "14", hint: "Completed this shift" },
      { title: "Walk-Ins", value: "6", hint: "Registered today" },
    ],
    rows: [
      { module: "Consultation Intake", status: "Open", owner: "Nurse Team", updatedAt: "3m ago" },
      { module: "Queue Triage", status: "In progress", owner: "Front Desk", updatedAt: "6m ago" },
      { module: "Vitals Recording", status: "Ready", owner: "Assigned Nurse", updatedAt: "14m ago" },
    ],
    nextActions: [
      "Approve consultation requests",
      "Register walk-in patients",
      "Start initial assessments",
    ],
  },
  "consultation-requests": {
    title: "Consultation Requests",
    subtitle: "Review and triage incoming requests",
    description:
      "Evaluate request details, prioritize urgency, and route approved cases into active queue handling.",
    metrics: [
      { title: "New Requests", value: "12", hint: "Received today" },
      { title: "Approved", value: "8", hint: "Moved to queue" },
      { title: "Declined", value: "1", hint: "Policy mismatch" },
      { title: "Rescheduled", value: "3", hint: "Awaiting new slots" },
    ],
    rows: [
      { module: "Request #CR-218", status: "Pending", owner: "Nurse A", updatedAt: "2m ago" },
      { module: "Request #CR-213", status: "Approved", owner: "Nurse B", updatedAt: "11m ago" },
      { module: "Request #CR-209", status: "Rescheduled", owner: "Nurse Lead", updatedAt: "28m ago" },
    ],
    nextActions: ["Approve", "Decline", "Reschedule"],
  },
  "queue-management": {
    title: "Queue Management",
    subtitle: "Live queue flow and patient movement",
    description:
      "Manage queue sequence, verify check-ins, and keep consultation flow balanced for attending clinicians.",
    metrics: [
      { title: "In Queue", value: "17", hint: "Currently waiting" },
      { title: "Called Next", value: "13", hint: "This shift" },
      { title: "Transferred", value: "2", hint: "Reassigned queue slots" },
      { title: "Completed", value: "11", hint: "Finished consultations" },
    ],
    rows: [
      { module: "Queue #Q-045", status: "Waiting", owner: "Front Desk", updatedAt: "1m ago" },
      { module: "Queue #Q-041", status: "Called", owner: "Nurse A", updatedAt: "4m ago" },
      { module: "Queue #Q-036", status: "Completed", owner: "Nurse B", updatedAt: "15m ago" },
    ],
    nextActions: ["Call next", "Skip", "Transfer", "Complete"],
  },
  "patient-records": {
    title: "Patient Records",
    subtitle: "Clinical record readiness and updates",
    description:
      "Review patient profiles, update basic clinical entries, and ensure records are complete for clinician review.",
    metrics: [
      { title: "Profiles Viewed", value: "22", hint: "Today" },
      { title: "Vitals Updated", value: "18", hint: "Current shift" },
      { title: "Missing Fields", value: "4", hint: "Needs completion" },
      { title: "Emergency Contacts", value: "16", hint: "Verified entries" },
    ],
    rows: [
      { module: "Patient #P-105", status: "Updated", owner: "Nurse A", updatedAt: "5m ago" },
      { module: "Patient #P-099", status: "Needs review", owner: "Nurse B", updatedAt: "19m ago" },
      { module: "Patient #P-091", status: "Complete", owner: "Records", updatedAt: "31m ago" },
    ],
    nextActions: ["Review profile", "Update vitals", "Verify emergency contact"],
  },
  consultations: {
    title: "Consultations",
    subtitle: "Initial assessment and handoff support",
    description:
      "Capture chief complaints and initial assessment notes before physician or dentist handoff.",
    metrics: [
      { title: "Assessments Started", value: "10", hint: "This shift" },
      { title: "Assessments Completed", value: "9", hint: "Ready for handoff" },
      { title: "Follow-up Tagged", value: "3", hint: "Requires revisit" },
      { title: "Pending Handoff", value: "2", hint: "Awaiting clinician availability" },
    ],
    rows: [
      { module: "Assessment #A-331", status: "In progress", owner: "Nurse A", updatedAt: "2m ago" },
      { module: "Assessment #A-327", status: "Completed", owner: "Nurse B", updatedAt: "9m ago" },
      { module: "Assessment #A-319", status: "Handoff", owner: "Nurse Lead", updatedAt: "26m ago" },
    ],
    nextActions: ["Record chief complaint", "Capture vital signs", "Complete initial notes"],
  },
  reports: {
    title: "Reports",
    subtitle: "Read-only operational reporting",
    description:
      "Review consultation and queue reports to track throughput and service quality trends.",
    metrics: [
      { title: "Daily Reports", value: "5", hint: "Available snapshots" },
      { title: "Queue Avg Wait", value: "11m", hint: "Current day estimate" },
      { title: "Assessment Count", value: "29", hint: "Last 24 hours" },
      { title: "Escalations", value: "2", hint: "Flagged cases" },
    ],
    rows: [
      { module: "Queue Throughput", status: "Ready", owner: "System", updatedAt: "3m ago" },
      { module: "Assessment Summary", status: "Ready", owner: "System", updatedAt: "7m ago" },
      { module: "Escalation Report", status: "Refreshing", owner: "Analytics", updatedAt: "1m ago" },
    ],
    nextActions: ["View reports", "Apply filters", "Export (future phase)"],
  },
  announcements: {
    title: "Announcements",
    subtitle: "Published health announcements (view only)",
    description:
      "Review active and scheduled announcements relevant to current clinic operations and patient flow.",
    metrics: [
      { title: "Active Posts", value: "7", hint: "Visible notices" },
      { title: "Scheduled Posts", value: "2", hint: "Upcoming reminders" },
      { title: "Read Confirmations", value: "19", hint: "Staff acknowledgments" },
      { title: "Priority Alerts", value: "1", hint: "Critical notice" },
    ],
    rows: [
      { module: "Clinic Hours Notice", status: "Active", owner: "Admin", updatedAt: "15m ago" },
      { module: "Vaccination Reminder", status: "Scheduled", owner: "Admin", updatedAt: "40m ago" },
      { module: "Inventory Advisory", status: "Active", owner: "Admin", updatedAt: "2h ago" },
    ],
    nextActions: ["Review posted notices", "Track priority alerts", "Confirm awareness"],
  },
  profile: {
    title: "Profile",
    subtitle: "Nurse account and personal settings",
    description:
      "Review account details, role designation, and personal notification preferences.",
    metrics: [
      { title: "Account Status", value: "Active", hint: "Current session valid" },
      { title: "Assigned Role", value: "Nurse", hint: "Mapped from clinic_staff" },
      { title: "Last Sign-In", value: "08:12", hint: "Today" },
      { title: "Notifications", value: "Enabled", hint: "Queue and request alerts" },
    ],
    rows: [
      { module: "Profile Details", status: "Up to date", owner: "Self", updatedAt: "Today" },
      { module: "Security Preferences", status: "Configured", owner: "Self", updatedAt: "Yesterday" },
      { module: "Alert Preferences", status: "Enabled", owner: "Self", updatedAt: "2d ago" },
    ],
    nextActions: ["Review profile", "Update preferences", "Check alert settings"],
  },
}
