import { listStaffUsers } from "@/features/admin/actions/user-management"
import { loadPhysicianWorkspace } from "@/features/physician/data/queries"
import {
  getClinicBreakStatus,
  getStaffBreakStatus,
  getStaffWeeklyHours,
} from "@/lib/availability/queries"
import { DAY_LABELS } from "@/lib/availability/types"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  demoAnnouncements,
  demoConsultationRequests,
} from "@/lib/demo/fixtures"
import {
  isAtSpecialtyAfterIntake,
  isNurseQueueException,
  needsNurseIntake,
} from "@/lib/health/nurse-queue"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type { QueueTicketRow } from "@/lib/health/types"
import { getDirectoryPatientRecordStats } from "@/lib/students/directory"
import { getConsultationStats } from "@/services/consultations"
import { getMedicalCertificateStats } from "@/services/medicalCertificates"
import type { ConsultationStats } from "@/types/consultation"
import type { MedicalCertificateStats } from "@/types/medicalCertificate"

const emptyConsultationStats: ConsultationStats = {
  openToday: 0,
  awaitingAssessment: 0,
  inProgress: 0,
  completedToday: 0,
}

const emptyCertificateStats: MedicalCertificateStats = {
  issuedThisMonth: 0,
  issuedToday: 0,
  drafts: 0,
  pending: 0,
}

function buildAnnouncements() {
  const published = demoAnnouncements.filter((a) => a.status === "published")
  return {
    publishedCount: published.length,
    recent: published.slice(0, 4).map((a) => ({
      id: a.id,
      title: a.title,
      audience: a.audience,
      status: a.status,
      publishedAt: a.publishedAt,
    })),
  }
}

function buildRequests(limit = 5) {
  const pending = demoConsultationRequests.filter((r) => r.status === "pending")
  return {
    pendingCount: pending.length,
    recent: pending.slice(0, limit).map((r) => ({
      id: r.id,
      patientName: r.patientName,
      studentId: r.studentId,
      service: r.service,
      preferredDate: r.preferredDate,
      preferredTime: r.preferredTime,
      status: r.status,
    })),
  }
}

function buildNurseLanes(
  allTickets: QueueTicketRow[],
  statsCheckedIn: number
): NonNullable<RoleDashboardSummary["nurseLanes"]> {
  const needIntake = allTickets.filter(needsNurseIntake).length
  const atPhysician = allTickets.filter(
    (t) => isAtSpecialtyAfterIntake(t) && t.station === "physician"
  ).length
  const atDentist = allTickets.filter(
    (t) => isAtSpecialtyAfterIntake(t) && t.station === "dentist"
  ).length
  const exceptions = allTickets.filter(isNurseQueueException).length
  const completedIntakes = allTickets.filter((t) =>
    Boolean(t.intakeCompletedAt)
  ).length

  return {
    needIntake,
    atPhysician,
    atDentist,
    exceptions,
    checkedIn: statsCheckedIn,
    completedIntakes,
  }
}

async function loadScheduleStrip(
  userId: string
): Promise<RoleDashboardSummary["schedule"]> {
  try {
    const now = new Date()
    const dow = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
    const [slots, staffBreak, clinicBreak] = await Promise.all([
      getStaffWeeklyHours(userId),
      getStaffBreakStatus(userId),
      getClinicBreakStatus(),
    ])
    const todaySlots = slots
      .filter((s) => s.isActive && s.dayOfWeek === dow)
      .map((s) => ({ startTime: s.startTime, endTime: s.endTime }))

    return {
      onBreak: staffBreak.isOnBreak,
      resumesAt: staffBreak.resumesAt,
      clinicOnBreak: clinicBreak.isOnBreak,
      todayLabel: DAY_LABELS[dow],
      todaySlots,
    }
  } catch {
    return {
      onBreak: false,
      resumesAt: null,
      clinicOnBreak: false,
      todayLabel: DAY_LABELS[new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6],
      todaySlots: [],
    }
  }
}

export async function loadRoleDashboardSummary(input: {
  designation: ClinicDesignation
  userId: string
  allTickets: QueueTicketRow[]
  checkedIn: number
}): Promise<RoleDashboardSummary> {
  const { designation, userId, allTickets, checkedIn } = input
  const isAdmin = designation === "admin"
  const isNurse = designation === "nurse"
  const isPhysician = designation === "physician"
  const isSpecialty = isPhysician || designation === "dentist"

  const [consultationStats, certificateStats, patientStats, staffSummary, schedule, physicianWorkspace] =
    await Promise.all([
      getConsultationStats().catch(() => emptyConsultationStats),
      getMedicalCertificateStats().catch(() => emptyCertificateStats),
      isAdmin || isSpecialty || isNurse
        ? getDirectoryPatientRecordStats().catch(() => null)
        : Promise.resolve(null),
      isAdmin
        ? listStaffUsers({ status: "all" }).then((res) =>
            res.ok ? res.summary : null
          )
        : Promise.resolve(null),
      isSpecialty ? loadScheduleStrip(userId) : Promise.resolve(null),
      isPhysician ? loadPhysicianWorkspace() : Promise.resolve(null),
    ])

  return {
    consultationStats,
    certificateStats,
    patientStats,
    staffSummary,
    announcements: buildAnnouncements(),
    requests: buildRequests(isNurse ? 6 : 4),
    nurseLanes: isNurse || isAdmin
      ? buildNurseLanes(allTickets, checkedIn)
      : null,
    schedule,
    physicianWorkspace,
  }
}
