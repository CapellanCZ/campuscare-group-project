/**
 * Compatibility re-exports. Prefer importing from `@/lib/staff/pages/*`
 * in route `page.tsx` files so each route only compiles its own feature graph.
 */
export { default as StaffHomePage } from "@/lib/staff/pages/home"
export { default as StaffQueuePage } from "@/lib/staff/pages/queue"
export { default as StaffRequestsPage } from "@/lib/staff/pages/requests"
export { StaffPatientsPage } from "@/lib/staff/pages/patients"
export { StaffPatientsBinPage } from "@/lib/staff/pages/patients-bin"
export { StaffConsultationsPage } from "@/lib/staff/pages/consultations"
export { StaffCertificatesPage } from "@/lib/staff/pages/certificates"
export { StaffReportsPage } from "@/lib/staff/pages/reports"
export { default as StaffAnnouncementsPage } from "@/lib/staff/pages/announcements"
export { StaffUsersPage } from "@/lib/staff/pages/users"
export { StaffSettingsPage } from "@/lib/staff/pages/settings"
