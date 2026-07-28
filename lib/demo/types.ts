/** Typed shapes for CampusCare module demo/fixture data (testing only). */

export type DemoStat = {
  key: string
  label: string
  value: string
  description?: string
}

export type ConsultationRequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "rescheduled"

export type DemoConsultationRequest = {
  id: string
  patientName: string
  studentId: string
  service: string
  preferredDate: string
  preferredTime: string
  reason: string
  status: ConsultationRequestStatus
  submittedAt: string
}

export type DemoPatient = {
  id: string
  studentId: string
  fullName: string
  course: string
  yearLevel: string
  bloodType: string
  allergies: string
  lastVisit: string
  consultationsCount: number
  documentsCount: number
}

export type ConsultationStatus =
  | "awaiting_assessment"
  | "in_progress"
  | "completed"

export type DemoConsultation = {
  id: string
  patientName: string
  studentId: string
  station: "nurse" | "physician" | "dentist"
  chiefComplaint: string
  status: ConsultationStatus
  startedAt: string
  provider: string
  hasAssessment: boolean
  hasDiagnosis: boolean
  hasPrescription: boolean
}

export type DemoReportRow = {
  id: string
  period: string
  consultations: number
  certificates: number
  walkIns: number
  avgWaitMinutes: number
  topService: string
}

export type AnnouncementStatus = "draft" | "scheduled" | "published"

export type DemoAnnouncement = {
  id: string
  title: string
  audience: string
  status: AnnouncementStatus
  author: string
  publishedAt: string | null
  updatedAt: string
}

export type StaffAccountStatus = "active" | "inactive" | "pending"

export type DemoStaffUser = {
  id: string
  fullName: string
  email: string
  designation: "admin" | "nurse" | "physician" | "dentist"
  office: string
  status: StaffAccountStatus
  lastSignIn: string
}

export type DemoSettingsSection = {
  id: string
  title: string
  description: string
  /** Permission key fragment under settings.* */
  permission:
    | "clinic"
    | "queue"
    | "notification"
    | "security"
    | "system"
    | "profile"
  values: { label: string; value: string }[]
}
