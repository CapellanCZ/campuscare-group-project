import type {
  DemoAnnouncement,
  DemoConsultationRequest,
  DemoReportRow,
  DemoSettingsSection,
  DemoStaffUser,
  DemoStat,
} from "@/lib/demo/types"

export const demoRequestStats: DemoStat[] = [
  { key: "pending", label: "Pending", value: "7", description: "Awaiting nurse review" },
  { key: "approved", label: "Approved today", value: "12", description: "Ready for queue" },
  { key: "rescheduled", label: "Rescheduled", value: "3", description: "New slots proposed" },
  { key: "declined", label: "Declined", value: "2", description: "This week" },
]

export const demoConsultationRequests: DemoConsultationRequest[] = [
  {
    id: "req-1001",
    patientName: "Maria Santos",
    studentId: "2021-04521",
    service: "General consultation",
    preferredDate: "2026-07-25",
    preferredTime: "09:30",
    reason: "Persistent headache for 3 days",
    status: "pending",
    submittedAt: "2026-07-24 18:12",
  },
  {
    id: "req-1002",
    patientName: "Juan Dela Cruz",
    studentId: "2020-11803",
    service: "Dental check-up",
    preferredDate: "2026-07-25",
    preferredTime: "10:00",
    reason: "Tooth sensitivity on the right side",
    status: "pending",
    submittedAt: "2026-07-24 19:04",
  },
  {
    id: "req-1003",
    patientName: "Aisha Rahman",
    studentId: "2022-06714",
    service: "Medical certificate",
    preferredDate: "2026-07-26",
    preferredTime: "13:00",
    reason: "Certificate for internship clearance",
    status: "approved",
    submittedAt: "2026-07-23 11:20",
  },
  {
    id: "req-1004",
    patientName: "Carlo Mendoza",
    studentId: "2019-03388",
    service: "Follow-up",
    preferredDate: "2026-07-25",
    preferredTime: "14:30",
    reason: "Blood pressure recheck",
    status: "rescheduled",
    submittedAt: "2026-07-22 16:45",
  },
  {
    id: "req-1005",
    patientName: "Grace Lim",
    studentId: "2023-00912",
    service: "General consultation",
    preferredDate: "2026-07-24",
    preferredTime: "11:00",
    reason: "Stomach pain after meals",
    status: "declined",
    submittedAt: "2026-07-23 08:05",
  },
  {
    id: "req-1006",
    patientName: "Paolo Reyes",
    studentId: "2021-07745",
    service: "Dental cleaning",
    preferredDate: "2026-07-28",
    preferredTime: "09:00",
    reason: "Routine cleaning before finals",
    status: "pending",
    submittedAt: "2026-07-24 21:18",
  },
]

export const demoReportStats: DemoStat[] = [
  { key: "consults", label: "Consultations (30d)", value: "312", description: "All stations" },
  { key: "certs", label: "Certificates (30d)", value: "64", description: "Issued" },
  { key: "wait", label: "Avg wait", value: "18 min", description: "Clinic-wide" },
  { key: "walkins", label: "Walk-ins (30d)", value: "97", description: "31% of visits" },
]

export const demoReportRows: DemoReportRow[] = [
  {
    id: "rep-1",
    period: "Jul 19–25, 2026",
    consultations: 78,
    certificates: 16,
    walkIns: 24,
    avgWaitMinutes: 17,
    topService: "General consultation",
  },
  {
    id: "rep-2",
    period: "Jul 12–18, 2026",
    consultations: 71,
    certificates: 14,
    walkIns: 22,
    avgWaitMinutes: 19,
    topService: "Dental check-up",
  },
  {
    id: "rep-3",
    period: "Jul 5–11, 2026",
    consultations: 69,
    certificates: 12,
    walkIns: 20,
    avgWaitMinutes: 21,
    topService: "Follow-up",
  },
  {
    id: "rep-4",
    period: "Jun 28–Jul 4, 2026",
    consultations: 94,
    certificates: 22,
    walkIns: 31,
    avgWaitMinutes: 16,
    topService: "General consultation",
  },
]

export const demoAnnouncementStats: DemoStat[] = [
  { key: "published", label: "Published", value: "4", description: "Visible now" },
  { key: "scheduled", label: "Scheduled", value: "1", description: "Upcoming" },
  { key: "draft", label: "Drafts", value: "2", description: "Unpublished" },
  { key: "reach", label: "Est. reach", value: "8.4k", description: "Students + staff" },
]

export const demoAnnouncements: DemoAnnouncement[] = [
  {
    id: "ann-1",
    title: "Clinic hours extended during finals week",
    audience: "All students",
    status: "published",
    author: "Clinic Admin",
    publishedAt: "2026-07-20 09:00",
    updatedAt: "2026-07-20 09:00",
  },
  {
    id: "ann-2",
    title: "Dental unit maintenance on Friday",
    audience: "Dental queue",
    status: "published",
    author: "Clinic Admin",
    publishedAt: "2026-07-22 15:30",
    updatedAt: "2026-07-23 08:10",
  },
  {
    id: "ann-3",
    title: "Flu vaccine drive — next Monday",
    audience: "All campus",
    status: "scheduled",
    author: "Clinic Admin",
    publishedAt: null,
    updatedAt: "2026-07-24 10:00",
  },
  {
    id: "ann-4",
    title: "Updated walk-in guidelines",
    audience: "Clinic staff",
    status: "draft",
    author: "Clinic Admin",
    publishedAt: null,
    updatedAt: "2026-07-24 16:20",
  },
]

export const demoUserStats: DemoStat[] = [
  { key: "total", label: "Staff accounts", value: "18", description: "Clinic web users" },
  { key: "active", label: "Active", value: "15", description: "Can sign in" },
  { key: "pending", label: "Pending approval", value: "2", description: "Awaiting admin" },
  { key: "inactive", label: "Inactive", value: "1", description: "Deactivated" },
]

export const demoStaffUsers: DemoStaffUser[] = [
  {
    id: "usr-1",
    fullName: "Liza Navarro",
    email: "liza.navarro@campus.edu",
    designation: "admin",
    office: "University Clinic",
    status: "active",
    lastSignIn: "2026-07-24 17:40",
  },
  {
    id: "usr-2",
    fullName: "Ana Cruz",
    email: "ana.cruz@campus.edu",
    designation: "nurse",
    office: "Triage Desk",
    status: "active",
    lastSignIn: "2026-07-25 07:55",
  },
  {
    id: "usr-3",
    fullName: "Dr. Ramon Villanueva",
    email: "r.villanueva@campus.edu",
    designation: "physician",
    office: "Consultation Room 1",
    status: "active",
    lastSignIn: "2026-07-25 08:20",
  },
  {
    id: "usr-4",
    fullName: "Dr. Elise Torres",
    email: "e.torres@campus.edu",
    designation: "dentist",
    office: "Dental Unit",
    status: "active",
    lastSignIn: "2026-07-25 08:05",
  },
  {
    id: "usr-5",
    fullName: "Mark Ocampo",
    email: "m.ocampo@campus.edu",
    designation: "nurse",
    office: "Triage Desk",
    status: "pending",
    lastSignIn: "—",
  },
  {
    id: "usr-6",
    fullName: "Sofia Reyes",
    email: "s.reyes@campus.edu",
    designation: "physician",
    office: "Consultation Room 2",
    status: "inactive",
    lastSignIn: "2026-05-12 10:11",
  },
]

export const demoSettingsSections: DemoSettingsSection[] = [
  {
    id: "clinic",
    title: "Clinic settings",
    description: "Operating hours, service catalog, and campus location.",
    permission: "clinic",
    values: [
      { label: "Weekday hours", value: "7:00 AM – 9:00 PM" },
      { label: "Saturday hours", value: "7:00 AM – 7:00 PM" },
      { label: "Default station", value: "Nurse triage" },
    ],
  },
  {
    id: "queue",
    title: "Queue settings",
    description: "Walk-in rules, ticket numbering, and display refresh.",
    permission: "queue",
    values: [
      { label: "Walk-in cutoff", value: "4:00 PM" },
      { label: "Ticket prefix", value: "CC-" },
      { label: "Display refresh", value: "5 seconds" },
    ],
  },
  {
    id: "notification",
    title: "Notification settings",
    description: "Staff alerts for requests, queue, and certificates.",
    permission: "notification",
    values: [
      { label: "Email alerts", value: "Enabled" },
      { label: "SMS reminders", value: "Disabled" },
      { label: "Digest", value: "Daily 6:00 PM" },
    ],
  },
  {
    id: "security",
    title: "Security settings",
    description: "Session length and OTP policies for staff login.",
    permission: "security",
    values: [
      { label: "Session length", value: "8 hours" },
      { label: "OTP expiry", value: "10 minutes" },
      { label: "Max devices", value: "3" },
    ],
  },
  {
    id: "system",
    title: "System settings",
    description: "Environment labels and maintenance mode.",
    permission: "system",
    values: [
      { label: "Environment", value: "Demo / staging" },
      { label: "Maintenance mode", value: "Off" },
      { label: "Data retention", value: "24 months" },
    ],
  },
  {
    id: "profile",
    title: "Profile settings",
    description: "Your display name, contact email, and designation.",
    permission: "profile",
    values: [
      { label: "Display name", value: "(from signed-in profile)" },
      { label: "Email", value: "(from signed-in profile)" },
      { label: "Preferred station", value: "Auto from designation" },
    ],
  },
]
