import { redirect } from "next/navigation"

import { AnnouncementsDemoPage } from "@/components/announcements/announcements-demo-page"
import { CertificatesDemoPage } from "@/components/certificates/certificates-demo-page"
import { ConsultationsDemoPage } from "@/components/consultations/consultations-demo-page"
import { RoleDashboard } from "@/components/dashboard/role-dashboard"
import { PatientsDemoPage } from "@/components/patients/patients-demo-page"
import { QueuePage } from "@/components/queue/queue-page"
import { ReportsDemoPage } from "@/components/reports/reports-demo-page"
import { RequestsDemoPage } from "@/components/requests/requests-demo-page"
import { SettingsDemoPage } from "@/components/settings/settings-demo-page"
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
  return <RequestsDemoPage access={access} />
}

export async function StaffPatientsPage() {
  const access = await requireStaffModule("patient_records")
  return <PatientsDemoPage access={access} />
}

export async function StaffConsultationsPage() {
  const access = await requireStaffModule("consultations")
  return <ConsultationsDemoPage access={access} />
}

export async function StaffCertificatesPage() {
  const access = await requireStaffModule("medical_certificates")
  return <CertificatesDemoPage access={access} />
}

export async function StaffReportsPage() {
  const access = await requireStaffModule("reports")
  return <ReportsDemoPage access={access} />
}

export async function StaffAnnouncementsPage() {
  const access = await requireStaffModule("announcements")
  return <AnnouncementsDemoPage access={access} />
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
