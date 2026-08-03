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
  isAtSpecialtyAfterIntake,
  isNurseQueueException,
  needsNurseIntake,
} from "@/lib/health/nurse-queue"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"
import type { QueueTicketRow } from "@/lib/health/types"
import { getDirectoryPatientRecordStats } from "@/lib/students/directory"
import {
  announcementCoverUrl,
  announcementExcerpt,
} from "@/features/announcements/lib/display"
import { getAnnouncements } from "@/services/announcements"
import { getConsultationRequests } from "@/services/consultation-requests"
import {
  getConsultationStats,
  getConsultations,
} from "@/services/consultations"
import { getMedicalCertificateStats } from "@/services/medicalCertificates"
import { isDentalReferralTreatment } from "@/lib/health/dental-form-options"
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

async function buildAnnouncements() {
  try {
    const list = await getAnnouncements({
      status: "published",
      page: 1,
      pageSize: 4,
      sortBy: "published_at",
      sortDirection: "desc",
      feed: true,
    })
    return {
      publishedCount: list.total,
      recent: list.items.map((a) => ({
        id: a.id,
        title: a.title,
        audience: a.audience,
        status: a.status,
        publishedAt: a.publishedAt,
        excerpt: announcementExcerpt(a.body, 90),
        coverUrl: announcementCoverUrl(a),
      })),
    }
  } catch {
    return {
      publishedCount: 0,
      recent: [],
    }
  }
}

async function buildRequests(limit = 5) {
  try {
    const list = await getConsultationRequests({
      status: "pending",
      page: 1,
      pageSize: limit,
    })
    return {
      pendingCount: list.total,
      recent: list.items.slice(0, limit).map((r) => ({
        id: r.id,
        patientName: r.patientName,
        studentId: r.studentId ?? "",
        service: r.service,
        preferredDate: r.preferredDate ?? "",
        preferredTime: r.preferredTime ?? "",
        status: r.status,
      })),
    }
  } catch {
    return {
      pendingCount: 0,
      recent: [],
    }
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

async function loadRecentConsultations(
  station: "dentist" | "physician" | null,
  limit = 5
): Promise<RoleDashboardSummary["recentConsultations"]> {
  try {
    const list = await getConsultations({
      page: 1,
      pageSize: 20,
      station: station ?? "all",
      status: "Completed",
    })
    return list.items.slice(0, limit).map((c) => ({
      id: c.id,
      patientName: c.patient.fullName,
      diagnosis: c.diagnosis,
      treatment: c.treatment,
      status: c.status,
      consultationDate: c.consultationDate,
      providerName: c.providerName,
    }))
  } catch {
    return []
  }
}

async function countDentalReferralsToday(): Promise<number> {
  try {
    const list = await getConsultations({
      page: 1,
      pageSize: 50,
      station: "dentist",
      consultationDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    })
    return list.items.filter((c) => isDentalReferralTreatment(c.treatment))
      .length
  } catch {
    return 0
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
  const isDentist = designation === "dentist"
  const isSpecialty = isPhysician || isDentist

  const [
    consultationStats,
    certificateStats,
    patientStats,
    staffSummary,
    schedule,
    physicianWorkspace,
    announcements,
    requests,
    recentConsultations,
    dentalReferralsToday,
  ] = await Promise.all([
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
    buildAnnouncements(),
    buildRequests(isNurse ? 6 : 4),
    isSpecialty
      ? loadRecentConsultations(isDentist ? "dentist" : "physician")
      : Promise.resolve([]),
    isDentist ? countDentalReferralsToday() : Promise.resolve(0),
  ])

  return {
    consultationStats,
    certificateStats,
    patientStats,
    staffSummary,
    announcements,
    requests,
    nurseLanes:
      isNurse || isAdmin
        ? buildNurseLanes(allTickets, checkedIn)
        : null,
    schedule,
    physicianWorkspace,
    recentConsultations,
    dentalReferralsToday,
  }
}
