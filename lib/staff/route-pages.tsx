import { redirect } from "next/navigation"

import { AnnouncementsPage } from "@/components/announcements/announcements-page"
import { CertificatesPage } from "@/components/certificates/certificates-demo-page"
import { ConsultationsPage } from "@/components/consultations/consultations-page"
import { RoleDashboard } from "@/components/dashboard/role-dashboard"
import { PatientsPage } from "@/components/patients/patients-page"
import { QueuePage } from "@/components/queue/queue-page"
import { ReportsDemoPage } from "@/components/reports/reports-demo-page"
import { RequestsPage } from "@/components/requests/requests-page"
import { SettingsDemoPage } from "@/components/settings/settings-demo-page"
import {
  getAnnouncements,
  getAnnouncementStats,
} from "@/services/announcements"
import {
  getConsultations,
  getConsultationStats,
} from "@/services/consultations"
import {
  getConsultationRequests,
  getConsultationRequestStats,
} from "@/services/consultationRequests"
import {
  getMedicalCertificates,
  getMedicalCertificateStats,
} from "@/services/medicalCertificates"
import {
  getPatientRecords,
  getPatientRecordStats,
} from "@/services/patientRecords"
import {
  AnnouncementServiceError,
  type AnnouncementListResult,
  type AnnouncementStats,
} from "@/types/announcement"
import {
  ConsultationServiceError,
  type ConsultationListResult,
  type ConsultationStats,
} from "@/types/consultation"
import {
  ConsultationRequestServiceError,
  type ConsultationRequestListResult,
  type ConsultationRequestStats,
} from "@/types/consultationRequest"
import {
  MedicalCertificateServiceError,
  type MedicalCertificateListResult,
  type MedicalCertificateStats,
} from "@/types/medicalCertificate"
import {
  PatientRecordServiceError,
  type PatientRecordListResult,
  type PatientRecordStats,
} from "@/types/patientRecord"
import { getStaffAccess } from "@/lib/auth/access"
import { requireStaffModule } from "@/lib/auth/require-module"
import { getDashboardBundle } from "@/lib/health/dashboard-queries"
import {
  computeQueueStats,
  getQueueActivity,
  getRecentlyServed,
  getStationBoards,
  getTodayQueueTickets,
} from "@/lib/health/queue-queries"
import { stationForDesignation } from "@/lib/health/roles"

export async function StaffHomePage() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) redirect("/login")

  const bundle = await getDashboardBundle(access.designation)

  return (
    <RoleDashboard
      access={access}
      kpis={bundle.kpis}
      tickets={bundle.tickets}
      boards={bundle.boards}
      activity={bundle.activity}
      recent={bundle.recent}
      stats={bundle.stats}
    />
  )
}

export async function StaffQueuePage() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) redirect("/login")

  const station = stationForDesignation(access.designation)
  const allTickets = await getTodayQueueTickets()
  const tickets =
    access.designation === "physician" || access.designation === "dentist"
      ? allTickets.filter((t) => t.station === station)
      : allTickets

  return (
    <QueuePage
      access={access}
      tickets={tickets}
      stats={computeQueueStats(tickets)}
      boards={await getStationBoards(allTickets)}
      recent={await getRecentlyServed(8, allTickets)}
      activity={await getQueueActivity(8, allTickets)}
    />
  )
}

export async function StaffRequestsPage() {
  const access = await requireStaffModule("consultation_requests")

  const emptyList: ConsultationRequestListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }
  const emptyStats: ConsultationRequestStats = {
    pending: 0,
    approvedToday: 0,
    rescheduled: 0,
    declined: 0,
  }

  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextList, nextStats] = await Promise.all([
      getConsultationRequests({ page: 1, pageSize: 10 }),
      getConsultationRequestStats(),
    ])
    list = nextList
    stats = nextStats
  } catch (error) {
    initialError =
      error instanceof ConsultationRequestServiceError
        ? error.message
        : "Could not load consultation requests. Please try again."
  }

  return (
    <RequestsPage
      access={access}
      initialList={list}
      initialStats={stats}
      initialError={initialError}
    />
  )
}

export async function StaffPatientsPage() {
  const access = await requireStaffModule("patient_records")

  const emptyList: PatientRecordListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }
  const emptyStats: PatientRecordStats = {
    total: 0,
    visitedThisMonth: 0,
    flaggedAllergies: 0,
    documents: 0,
  }

  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextList, nextStats] = await Promise.all([
      getPatientRecords({ page: 1, pageSize: 10 }),
      getPatientRecordStats(),
    ])
    list = nextList
    stats = nextStats
  } catch (error) {
    initialError =
      error instanceof PatientRecordServiceError
        ? error.message
        : "Could not load patient records. Please try again."
  }

  return (
    <PatientsPage
      access={access}
      initialList={list}
      initialStats={stats}
      initialError={initialError}
    />
  )
}

export async function StaffConsultationsPage() {
  const access = await requireStaffModule("consultations")

  const emptyList: ConsultationListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }
  const emptyStats: ConsultationStats = {
    openToday: 0,
    awaitingAssessment: 0,
    inProgress: 0,
    completedToday: 0,
  }

  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextList, nextStats] = await Promise.all([
      getConsultations({ page: 1, pageSize: 10 }),
      getConsultationStats(),
    ])
    list = nextList
    stats = nextStats
  } catch (error) {
    initialError =
      error instanceof ConsultationServiceError
        ? error.message
        : "Could not load consultations. Please try again."
  }

  return (
    <ConsultationsPage
      access={access}
      initialList={list}
      initialStats={stats}
      initialError={initialError}
    />
  )
}

export async function StaffCertificatesPage() {
  const access = await requireStaffModule("medical_certificates")

  const emptyList: MedicalCertificateListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }
  const emptyStats: MedicalCertificateStats = {
    issuedThisMonth: 0,
    issuedToday: 0,
    drafts: 0,
    pending: 0,
  }

  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextList, nextStats] = await Promise.all([
      getMedicalCertificates({
        page: 1,
        pageSize: 10,
        sortBy: "issued_at",
        sortDirection: "desc",
      }),
      getMedicalCertificateStats(),
    ])
    list = nextList
    stats = nextStats
  } catch (error) {
    initialError =
      error instanceof MedicalCertificateServiceError
        ? error.message
        : "Could not load medical certificates. Please try again."
  }

  return (
    <CertificatesPage
      access={access}
      initialList={list}
      initialStats={stats}
      initialError={initialError}
    />
  )
}

export async function StaffReportsPage() {
  const access = await requireStaffModule("reports")
  return <ReportsDemoPage access={access} />
}

export async function StaffAnnouncementsPage() {
  const access = await requireStaffModule("announcements")

  const emptyList: AnnouncementListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }
  const emptyStats: AnnouncementStats = {
    published: 0,
    scheduled: 0,
    drafts: 0,
  }

  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextList, nextStats] = await Promise.all([
      getAnnouncements({
        page: 1,
        pageSize: 10,
        sortBy: "updated_at",
        sortDirection: "desc",
      }),
      getAnnouncementStats(),
    ])
    list = nextList
    stats = nextStats
  } catch (error) {
    initialError =
      error instanceof AnnouncementServiceError
        ? error.message
        : "Could not load announcements. Please try again."
  }

  return (
    <AnnouncementsPage
      access={access}
      initialList={list}
      initialStats={stats}
      initialError={initialError}
    />
  )
}

export async function StaffUsersPage() {
  await requireStaffModule("user_management")
  const { UserManagementPage } = await import(
    "@/features/admin/components/user-management-page"
  )
  return <UserManagementPage directory="staff" />
}

export async function StaffSettingsPage() {
  const access = await requireStaffModule("settings")
  return <SettingsDemoPage access={access} />
}
