import { redirect } from "next/navigation"

import { AnnouncementsPage } from "@/components/announcements/announcements-demo-page"
import { CertificatesPage } from "@/components/certificates/certificates-demo-page"
import { ConsultationsPage } from "@/components/consultations/consultations-demo-page"
import { RoleDashboard } from "@/components/dashboard/role-dashboard"
import { PatientsPage } from "@/components/patients/patients-demo-page"
import { QueuePage } from "@/components/queue/queue-page"
import { RequestsDemoPage } from "@/components/requests/requests-demo-page"
import { SettingsDemoPage } from "@/components/settings/settings-demo-page"
import { ReportsAnalyticsPage } from "@/features/reports/components/reports-analytics-page"
import { loadReportsBundle } from "@/features/reports/data/queries"
import { loadOfficeHoursBundle } from "@/features/availability/actions/availability"
import { OfficeHoursSettings } from "@/features/admin/components/office-hours-settings"
import {
  getAnnouncements,
  getAnnouncementStats,
} from "@/services/announcements"
import {
  getConsultations,
  getConsultationStats,
  listConsultationFilterOptions,
} from "@/services/consultations"
import {
  getDirectoryPatientRecordStats,
  listDirectoryPatientRecords,
} from "@/lib/students/directory"
import {
  getMedicalCertificates,
  getMedicalCertificateStats,
} from "@/services/medicalCertificates"
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
import {
  enrichDashboardKpis,
  getDashboardBundle,
} from "@/lib/health/dashboard-queries"
import { loadRoleDashboardSummary } from "@/lib/health/load-role-dashboard-summary"
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
  const summary = await loadRoleDashboardSummary({
    designation: access.designation,
    userId: access.userId,
    allTickets: bundle.allTickets,
    checkedIn: bundle.stats.checkedIn,
  })
  const kpis = enrichDashboardKpis(
    access.designation,
    bundle.kpis,
    summary,
    bundle.allTickets
  )

  return (
    <RoleDashboard
      access={access}
      kpis={kpis}
      tickets={bundle.tickets}
      boards={bundle.boards}
      activity={bundle.activity}
      recent={bundle.recent}
      stats={bundle.stats}
      summary={summary}
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
  return <RequestsDemoPage access={access} />
}

export async function StaffPatientsPage() {
  const access = await requireStaffModule("patient_records")

  const emptyList: PatientRecordListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }
  const emptyStats: PatientRecordStats = {
    patientsOnFile: 0,
    visitedThisMonth: 0,
    flaggedAllergies: 0,
    documents: 0,
  }

  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextList, nextStats] = await Promise.all([
      listDirectoryPatientRecords({ page: 1, pageSize: 20 }),
      getDirectoryPatientRecordStats(),
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
    pageSize: 20,
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
  let providers: string[] = []
  let stations: string[] = []
  let initialError: string | null = null

  try {
    const [nextList, nextStats, options] = await Promise.all([
      getConsultations({ page: 1, pageSize: 20 }),
      getConsultationStats(),
      listConsultationFilterOptions(),
    ])
    list = nextList
    stats = nextStats
    providers = options.providers
    stations = options.stations
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
      initialProviders={providers}
      initialStations={stations}
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
  const bundle = await loadReportsBundle(access.designation)
  return <ReportsAnalyticsPage access={access} initialBundle={bundle} />
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
    total: 0,
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
  if (access.primaryRole === "admin") {
    const bundle = await loadOfficeHoursBundle()
    return (
      <OfficeHoursSettings
        access={access}
        clinicHours={bundle.clinicHours}
        staff={bundle.staff}
      />
    )
  }
  return <SettingsDemoPage access={access} />
}
