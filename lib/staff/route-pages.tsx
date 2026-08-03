import { redirect } from "next/navigation"

import { AnnouncementsPage } from "@/components/announcements/announcements-demo-page"
import { CertificatesPage } from "@/components/certificates/certificates-demo-page"
import { ConsultationsPage } from "@/components/consultations/consultations-demo-page"
import { RoleDashboard } from "@/components/dashboard/role-dashboard"
import { PatientsPage } from "@/components/patients/patients-demo-page"
import { QueuePage } from "@/components/queue/queue-page"
import { RequestsPage } from "@/components/requests/requests-demo-page"
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
  getConsultationRequests,
  getConsultationRequestStats,
} from "@/services/consultation-requests"
import {
  getMedicalCertificates,
  getMedicalCertificateStats,
} from "@/services/medicalCertificates"
import {
  ConsultationRequestServiceError,
  type ConsultationRequestListResult,
  type ConsultationRequestStats,
} from "@/types/consultationRequest"
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
import { canMutate } from "@/lib/auth/permissions"
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
  const isPhysician = access.designation === "physician"

  return (
    <QueuePage
      access={access}
      tickets={tickets}
      stats={computeQueueStats(tickets)}
      boards={
        isPhysician ? [] : await getStationBoards(allTickets)
      }
      recent={await getRecentlyServed(8, tickets)}
      activity={
        isPhysician ? [] : await getQueueActivity(8, allTickets)
      }
    />
  )
}

export async function StaffRequestsPage() {
  const access = await requireStaffModule("consultation_requests")

  const emptyList: ConsultationRequestListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  }
  const emptyStats: ConsultationRequestStats = {
    pending: 0,
    approved: 0,
    declined: 0,
    rescheduled: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  }

  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextList, nextStats] = await Promise.all([
      getConsultationRequests({ page: 1, pageSize: 50, status: "all" }),
      getConsultationRequestStats(),
    ])
    list = nextList
    stats = nextStats
  } catch (error) {
    initialError =
      error instanceof ConsultationRequestServiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to load consultation requests."
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
      getConsultations({
        page: 1,
        pageSize: 20,
        station:
          access.designation === "dentist"
            ? "dentist"
            : access.designation === "physician"
              ? "physician"
              : "all",
      }),
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
  let announcements: Awaited<ReturnType<typeof getAnnouncements>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 6,
    totalPages: 1,
  }
  try {
    announcements = await getAnnouncements({
      page: 1,
      pageSize: 6,
      sortBy: "updated_at",
      sortDirection: "desc",
      feed: true,
    })
  } catch {
    // Reports still render without the announcements strip.
  }
  return (
    <ReportsAnalyticsPage
      access={access}
      initialBundle={bundle}
      initialAnnouncements={announcements}
    />
  )
}

export async function StaffAnnouncementsPage() {
  const access = await requireStaffModule("announcements")
  const canManage = canMutate(access.designation, "announcements.add")

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

  let feed = emptyList
  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextFeed, nextList, nextStats] = await Promise.all([
      getAnnouncements({
        page: 1,
        pageSize: 6,
        sortBy: "updated_at",
        sortDirection: "desc",
        feed: true,
      }),
      canManage
        ? getAnnouncements({
            page: 1,
            pageSize: 10,
            sortBy: "updated_at",
            sortDirection: "desc",
          })
        : Promise.resolve(emptyList),
      getAnnouncementStats(),
    ])
    feed = nextFeed
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
      initialFeed={feed}
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
  const { getStaffProfile, getUserPreferences } = await import(
    "@/services/staff-profile"
  )
  const { ProfileSettingsPage } = await import(
    "@/components/settings/profile-settings-page"
  )
  const [profile, preferences] = await Promise.all([
    getStaffProfile(access.userId),
    getUserPreferences(access.userId),
  ])

  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
        Unable to load your profile.
      </div>
    )
  }

  const profilePage = (
    <ProfileSettingsPage profile={profile} preferences={preferences} />
  )

  if (access.primaryRole === "admin") {
    const bundle = await loadOfficeHoursBundle()
    return (
      <div className="flex flex-1 flex-col gap-8">
        {profilePage}
        <OfficeHoursSettings
          access={access}
          clinicHours={bundle.clinicHours}
          staff={bundle.staff}
        />
      </div>
    )
  }

  if (access.primaryRole === "physician") {
    const { getClinicHours, getStaffWeeklyHours } = await import(
      "@/lib/availability/queries"
    )
    const { StaffSchedulePage } = await import(
      "@/features/availability/components/staff-schedule-page"
    )
    const [availability, clinicHours] = await Promise.all([
      getStaffWeeklyHours(access.userId),
      getClinicHours(),
    ])
    return (
      <div className="flex flex-1 flex-col gap-8">
        {profilePage}
        <StaffSchedulePage
          role={access.primaryRole}
          doctorName={access.fullName}
          availability={availability}
          clinicHours={clinicHours}
          embeddedInSettings
        />
      </div>
    )
  }

  if (access.primaryRole === "dentist") {
    const { getClinicHours, getStaffWeeklyHours } = await import(
      "@/lib/availability/queries"
    )
    const { StaffSchedulePage } = await import(
      "@/features/availability/components/staff-schedule-page"
    )
    const [availability, clinicHours] = await Promise.all([
      getStaffWeeklyHours(access.userId),
      getClinicHours(),
    ])
    return (
      <div className="flex flex-1 flex-col gap-8">
        {profilePage}
        <StaffSchedulePage
          role={access.primaryRole}
          doctorName={access.fullName}
          availability={availability}
          clinicHours={clinicHours}
          embeddedInSettings
        />
      </div>
    )
  }

  return profilePage
}
