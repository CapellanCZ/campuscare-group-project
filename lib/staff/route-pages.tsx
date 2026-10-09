import { redirect } from "next/navigation"

import { AnnouncementsPage } from "@/components/announcements/announcements-demo-page"
import { CertificatesPage } from "@/components/certificates/certificates-demo-page"
import { ConsultationsPage } from "@/components/consultations/consultations-demo-page"
import { RoleDashboard } from "@/components/dashboard/role-dashboard"
import { PatientsBinPage } from "@/components/patients/patients-bin-page"
import { PatientsPage } from "@/components/patients/patients-demo-page"
import { QueuePage } from "@/components/queue/queue-page"
import { RequestsPage } from "@/components/requests/requests-demo-page"
import { ReportsAnalyticsPage } from "@/features/reports/components/reports-analytics-page"
import { loadReportsBundle } from "@/features/reports/data/queries"
import { loadOfficeHoursBundle } from "@/features/availability/actions/availability"
import { OfficeHoursSettings } from "@/features/admin/components/office-hours-settings"
import { adminPageShellClassName } from "@/features/admin/lib/admin-surface"
import {
  getAnnouncements,
  getAnnouncementStats,
} from "@/services/announcements"
import {
  getDirectoryPatientRecordStats,
  listArchivedDirectoryPatientRecords,
  listDirectoryPatientRecords,
} from "@/lib/students/directory"
import {
  getAppointmentRequests,
  getAppointmentRequestStats,
} from "@/services/appointment-requests"
import { getMedicalDocuments } from "@/services/medicalDocuments"
import { getMedicalCertificateStats } from "@/services/medicalCertificates"
import {
  AppointmentRequestServiceError,
  NURSE_REQUEST_TAB_STATUSES,
  type AppointmentRequestListResult,
  type AppointmentRequestStats,
} from "@/types/appointmentRequest"
import {
  AnnouncementServiceError,
  type AnnouncementListResult,
  type AnnouncementStats,
} from "@/types/announcement"
import {
  MedicalCertificateServiceError,
  type MedicalCertificateStats,
} from "@/types/medicalCertificate"
import {
  MedicalDocumentServiceError,
  type MedicalDocumentListResult,
} from "@/types/medicalDocument"
import {
  PatientRecordServiceError,
  type PatientRecordListResult,
  type PatientRecordStats,
} from "@/types/patientRecord"
import { getStaffAccess } from "@/lib/auth/access"
import { canMutate } from "@/lib/auth/permissions"
import { requireStaffModule } from "@/lib/auth/require-module"
import {
  computeQueueStats,
  getQueueActivity,
  getNurseRecentlyServed,
  getRecentlyServed,
  getStationBoards,
  getTodayQueueTickets,
} from "@/lib/health/queue-queries"
import { stationForDesignation } from "@/lib/health/roles"

export async function StaffHomePage() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) redirect("/login")

  // Auth-only RSC: chrome paints immediately; KPI/queue data loads on the client.
  return <RoleDashboard access={access} hydrateFromCache />
}

export async function StaffQueuePage() {
  const access = await requireStaffModule("queue_management")

  const station = stationForDesignation(access.designation)
  const allTickets = await getTodayQueueTickets()
  const tickets =
    access.designation === "physician" || access.designation === "dentist"
      ? allTickets.filter((t) => t.station === station)
      : allTickets
  const isPhysician = access.designation === "physician"
  const isNurse = access.designation === "nurse"

  const [boards, recent, activity] = await Promise.all([
    isPhysician ? Promise.resolve([]) : getStationBoards(allTickets),
    isNurse
      ? getNurseRecentlyServed(8, tickets)
      : getRecentlyServed(8, tickets),
    isPhysician ? Promise.resolve([]) : getQueueActivity(8, allTickets),
  ])

  return (
    <QueuePage
      access={access}
      tickets={tickets}
      stats={computeQueueStats(tickets)}
      boards={boards}
      recent={recent}
      activity={activity}
    />
  )
}

export async function StaffRequestsPage() {
  const access = await requireStaffModule("consultation_requests")

  const emptyList: AppointmentRequestListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  }
  const emptyStats: AppointmentRequestStats = {
    pending: 0,
    confirmed: 0,
    waitlisted: 0,
    rescheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    total: 0,
  }

  let list = emptyList
  let stats = emptyStats
  let initialError: string | null = null

  try {
    const [nextList, nextStats] = await Promise.all([
      getAppointmentRequests({
        page: 1,
        pageSize: 50,
        status: "all",
        statuses:
          access.designation === "nurse"
            ? NURSE_REQUEST_TAB_STATUSES
            : undefined,
      }),
      getAppointmentRequestStats(),
    ])
    list = nextList
    stats = nextStats
  } catch (error) {
    initialError =
      error instanceof AppointmentRequestServiceError
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

export async function StaffPatientsBinPage() {
  const access = await requireStaffModule("patient_records")

  const emptyList: PatientRecordListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }

  let list = emptyList
  let initialError: string | null = null

  try {
    list = await listArchivedDirectoryPatientRecords({ page: 1, pageSize: 20 })
  } catch (error) {
    initialError =
      error instanceof PatientRecordServiceError
        ? error.message
        : "Could not load archived patient records. Please try again."
  }

  return (
    <PatientsBinPage
      access={access}
      initialList={list}
      initialError={initialError}
    />
  )
}

export async function StaffConsultationsPage() {
  const access = await requireStaffModule("consultations")

  // Auth-only RSC: list data is cached + fetched on the client so sidebar
  // navigation paints immediately from prefetch / last visit.
  return (
    <ConsultationsPage
      access={access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }}
      initialStats={{
        openToday: 0,
        awaitingAssessment: 0,
        inProgress: 0,
        completedToday: 0,
      }}
      hydrateFromCache
    />
  )
}

export async function StaffCertificatesPage() {
  const access = await requireStaffModule("medical_certificates")

  const emptyList: MedicalDocumentListResult = {
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

  const issuedBy =
    access.designation === "physician" || access.designation === "dentist"
      ? access.userId
      : null

  try {
    const [nextList, nextStats] = await Promise.all([
      getMedicalDocuments({
        page: 1,
        pageSize: 10,
        ...(issuedBy ? { issuedBy } : {}),
      }),
      getMedicalCertificateStats(issuedBy),
    ])
    list = nextList
    stats = nextStats
  } catch (error) {
    initialError =
      error instanceof MedicalDocumentServiceError ||
      error instanceof MedicalCertificateServiceError
        ? error.message
        : "Could not load medical documents. Please try again."
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

  if (access.designation === "admin" || access.designation === "nurse") {
    const { defaultFiltersFor } = await import(
      "@/features/reports/data/apply-filters"
    )
    const { loadAdminReportsAggregates } = await import(
      "@/features/admin/data/reports-aggregates"
    )
    const filters = defaultFiltersFor(access.designation)
    const aggregates = await loadAdminReportsAggregates(
      filters,
      access.designation === "nurse" ? "nurse" : "admin"
    )
    return (
      <ReportsAnalyticsPage
        access={access}
        initialAdminFilters={filters}
        initialAdminAggregates={aggregates}
      />
    )
  }

  const bundle = await loadReportsBundle(access.designation)

  let announcements: Awaited<ReturnType<typeof getAnnouncements>> | undefined
  announcements = {
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
    <ProfileSettingsPage
      profile={profile}
      preferences={preferences}
      elevated={access.primaryRole === "admin"}
    />
  )

  if (access.primaryRole === "admin") {
    const bundle = await loadOfficeHoursBundle()
    return (
      <div className={adminPageShellClassName("gap-8")}>
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
          doctorName={access.fullName}
          availability={availability}
          clinicHours={clinicHours}
          embeddedInSettings
        />
      </div>
    )
  }

  if (access.primaryRole === "nurse") {
    const { getClinicCapacities } = await import(
      "@/services/consultation-capacity"
    )
    const { getClinicHours, getStaffWeeklyHours } = await import(
      "@/lib/availability/queries"
    )
    const { ConsultationCapacitySettings } = await import(
      "@/features/admin/components/consultation-capacity-settings"
    )
    const { StaffSchedulePage } = await import(
      "@/features/availability/components/staff-schedule-page"
    )
    const [capacities, availability, clinicHours] = await Promise.all([
      getClinicCapacities(),
      getStaffWeeklyHours(access.userId),
      getClinicHours(),
    ])
    return (
      <div className="flex flex-1 flex-col gap-8">
        <ProfileSettingsPage
          profile={profile}
          preferences={preferences}
          rightColumnExtras={
            <ConsultationCapacitySettings
              initial={capacities}
              elevated={false}
            />
          }
        />
        <StaffSchedulePage
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
