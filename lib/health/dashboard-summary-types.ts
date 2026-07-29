import type { StaffDirectorySummary } from "@/features/admin/types/user-management"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"
import type { ConsultationRequestStatus } from "@/lib/demo/types"
import type { ConsultationStats } from "@/types/consultation"
import type { MedicalCertificateStats } from "@/types/medicalCertificate"
import type { PatientRecordStats } from "@/types/patientRecord"

export type DashboardRequestPreview = {
  id: string
  patientName: string
  studentId: string
  service: string
  preferredDate: string
  preferredTime: string
  status: ConsultationRequestStatus
}

export type DashboardAnnouncementPreview = {
  id: string
  title: string
  audience: string
  status: "draft" | "scheduled" | "published"
  publishedAt: string | null
}

export type DashboardScheduleStrip = {
  onBreak: boolean
  resumesAt: string | null
  clinicOnBreak: boolean
  todayLabel: string
  todaySlots: Array<{ startTime: string; endTime: string }>
}

export type DashboardNurseLanes = {
  needIntake: number
  atPhysician: number
  atDentist: number
  exceptions: number
  checkedIn: number
  completedIntakes: number
}

export type RoleDashboardSummary = {
  consultationStats: ConsultationStats
  certificateStats: MedicalCertificateStats
  patientStats: PatientRecordStats | null
  staffSummary: StaffDirectorySummary | null
  announcements: {
    publishedCount: number
    recent: DashboardAnnouncementPreview[]
  }
  requests: {
    pendingCount: number
    recent: DashboardRequestPreview[]
  }
  nurseLanes: DashboardNurseLanes | null
  schedule: DashboardScheduleStrip | null
  physicianWorkspace: PhysicianWorkspace | null
}
