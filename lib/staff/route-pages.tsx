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
import { getAnnouncements } from "@/services/announcements"
import { listArchivedDirectoryPatientRecords } from "@/lib/students/directory"
import { type AnnouncementListResult } from "@/types/announcement"
import {
  PatientRecordServiceError,
  type PatientRecordListResult,
} from "@/types/patientRecord"
import { getStaffAccess } from "@/lib/auth/access"
import { requireStaffModule } from "@/lib/auth/require-module"
import { computeQueueStats } from "@/lib/health/queue-queries"

export async function StaffHomePage() {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) redirect("/login")

  // Auth-only RSC: chrome paints immediately; KPI/queue data loads on the client.
  return <RoleDashboard access={access} hydrateFromCache />
}

export async function StaffQueuePage() {
  const access = await requireStaffModule("queue_management")

  // Auth-only RSC — queue tickets load on the client so nav paints immediately.
  return (
    <QueuePage
      access={access}
      tickets={[]}
      stats={computeQueueStats([])}
      boards={[]}
      recent={[]}
      activity={[]}
      hydrateFromCache
    />
  )
}

export async function StaffRequestsPage() {
  const access = await requireStaffModule("consultation_requests")

  return (
    <RequestsPage
      access={access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      }}
      initialStats={{
        pending: 0,
        confirmed: 0,
        waitlisted: 0,
        rescheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
        total: 0,
      }}
      hydrateFromCache
    />
  )
}

export async function StaffPatientsPage() {
  const access = await requireStaffModule("patient_records")

  return (
    <PatientsPage
      access={access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }}
      initialStats={{
        patientsOnFile: 0,
        visitedThisMonth: 0,
        flaggedAllergies: 0,
        documents: 0,
      }}
      hydrateFromCache
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

  return (
    <CertificatesPage
      access={access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      }}
      initialStats={{
        issuedThisMonth: 0,
        issuedToday: 0,
        drafts: 0,
        pending: 0,
      }}
      hydrateFromCache
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

  const emptyList: AnnouncementListResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }

  return (
    <AnnouncementsPage
      access={access}
      initialFeed={emptyList}
      initialList={emptyList}
      initialStats={{
        published: 0,
        scheduled: 0,
        drafts: 0,
        total: 0,
      }}
      hydrateFromCache
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
