import type { StaffDirectorySummary } from "@/features/admin/types/user-management"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"
import type { AppointmentRequestStatus } from "@/types/appointmentRequest"
import type { AnnouncementStats } from "@/types/announcement"
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
  status: AppointmentRequestStatus
  queueNumber?: number | null
  providerType?: string
}

export type DashboardAnnouncementPreview = {
  id: string
  title: string
  audience: string
  status: "draft" | "scheduled" | "published"
  publishedAt: string | null
  excerpt: string
  coverUrl: string | null
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

export type DashboardRecentConsultation = {
  id: string
  patientName: string
  diagnosis: string | null
  treatment: string | null
  status: string
  consultationDate: string
  providerName: string | null
}

export type RoleDashboardSummary = {
  consultationStats: ConsultationStats
  certificateStats: MedicalCertificateStats
  patientStats: PatientRecordStats | null
  staffSummary: StaffDirectorySummary | null
  announcements: {
    publishedCount: number
    recent: DashboardAnnouncementPreview[]
    /** Full status breakdown (admin dashboard summary cards). */
    stats: AnnouncementStats | null
  }
  requests: {
    pendingCount: number
    recent: DashboardRequestPreview[]
  }
  nurseLanes: DashboardNurseLanes | null
  schedule: DashboardScheduleStrip | null
  physicianWorkspace: PhysicianWorkspace | null
  /** Recent completed consultations (station-scoped for specialty roles). */
  recentConsultations: DashboardRecentConsultation[]
  dentalReferralsToday: number
}
