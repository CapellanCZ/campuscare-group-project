import type { ClinicDesignation } from "@/lib/auth/types"

/** Access level from CampusCare role matrices: ✓ = full, view = view, x = none */
export type AccessLevel = "none" | "view" | "full"

export type StaffClinicRole = Exclude<ClinicDesignation, "queue_display">

/** Feature permissions from the CampusCare tabs & permissions matrices */
export type Permission =
  // Dashboard
  | "dashboard.cards"
  | "dashboard.recent_requests"
  | "dashboard.live_queue"
  | "dashboard.consultation_statistics"
  | "dashboard.recent_activities"
  // Consultation Requests
  | "requests.summary_cards"
  | "requests.search_filters"
  | "requests.table"
  | "requests.view_patient_details"
  | "requests.approve"
  | "requests.decline"
  | "requests.reschedule"
  // Queue Management
  | "queue.summary_cards"
  | "queue.table"
  | "queue.register_walk_in"
  | "queue.verify_check_in"
  | "queue.call_next"
  | "queue.skip"
  | "queue.mark_complete"
  // Patient Records
  | "patients.summary_cards"
  | "patients.search"
  | "patients.table"
  | "patients.view_profile"
  | "patients.edit_information"
  | "patients.update_medical"
  | "patients.view_consultation_history"
  | "patients.view_medical_documents"
  // Consultations
  | "consultations.cards"
  | "consultations.view_patient"
  | "consultations.record_initial_assessment"
  | "consultations.create_record"
  | "consultations.update_record"
  | "consultations.record_diagnosis"
  | "consultations.record_treatment"
  | "consultations.record_prescription"
  | "consultations.complete"
  | "consultations.generate_certificate"
  // Medical Certificates
  | "certificates.summary_cards"
  | "certificates.search_patient"
  | "certificates.view_history"
  | "certificates.generate"
  | "certificates.preview"
  | "certificates.print"
  | "certificates.download_pdf"
  // Reports
  | "reports.summary_cards"
  | "reports.filters"
  | "reports.charts"
  | "reports.consultation"
  | "reports.certificate"
  | "reports.export_pdf"
  | "reports.export_excel"
  // Announcements
  | "announcements.cards"
  | "announcements.table"
  | "announcements.add"
  | "announcements.edit"
  | "announcements.delete"
  | "announcements.publish"
  // User Management
  | "users.summary_cards"
  | "users.table"
  | "users.add"
  | "users.edit"
  | "users.reset_password"
  | "users.activate"
  | "users.delete"
  // Settings
  | "settings.clinic"
  | "settings.queue"
  | "settings.notification"
  | "settings.security"
  | "settings.system"
  | "settings.profile"

/** Sidebar / route modules that map to permission groups */
export type NavModule =
  | "dashboard"
  | "consultation_requests"
  | "queue_management"
  | "patient_records"
  | "consultations"
  | "medical_certificates"
  | "reports"
  | "announcements"
  | "user_management"
  | "settings"

const ALL: AccessLevel = "full"
const VIEW: AccessLevel = "view"
const NONE: AccessLevel = "none"

type RoleAccess = Record<StaffClinicRole, AccessLevel>

function roles(
  admin: AccessLevel,
  nurse: AccessLevel,
  physician: AccessLevel,
  dentist: AccessLevel
): RoleAccess {
  return { admin, nurse, physician, dentist }
}

const MATRIX: Record<Permission, RoleAccess> = {
  // Dashboard
  "dashboard.cards": roles(ALL, ALL, ALL, ALL),
  "dashboard.recent_requests": roles(ALL, ALL, ALL, ALL),
  "dashboard.live_queue": roles(ALL, ALL, ALL, ALL),
  "dashboard.consultation_statistics": roles(ALL, VIEW, VIEW, VIEW),
  "dashboard.recent_activities": roles(ALL, ALL, ALL, ALL),

  // Consultation Requests
  "requests.summary_cards": roles(ALL, ALL, ALL, ALL),
  "requests.search_filters": roles(ALL, ALL, ALL, ALL),
  "requests.table": roles(ALL, ALL, ALL, ALL),
  "requests.view_patient_details": roles(ALL, ALL, ALL, ALL),
  "requests.approve": roles(NONE, ALL, NONE, NONE),
  "requests.decline": roles(NONE, ALL, NONE, NONE),
  "requests.reschedule": roles(NONE, ALL, NONE, NONE),

  // Queue Management
  "queue.summary_cards": roles(ALL, ALL, ALL, ALL),
  "queue.table": roles(ALL, ALL, ALL, ALL),
  "queue.register_walk_in": roles(NONE, ALL, NONE, NONE),
  "queue.verify_check_in": roles(NONE, ALL, NONE, NONE),
  "queue.call_next": roles(NONE, ALL, ALL, ALL),
  "queue.skip": roles(NONE, ALL, ALL, ALL),
  "queue.mark_complete": roles(NONE, ALL, ALL, ALL),

  // Patient Records
  "patients.summary_cards": roles(ALL, ALL, ALL, ALL),
  "patients.search": roles(ALL, ALL, ALL, ALL),
  "patients.table": roles(ALL, ALL, ALL, ALL),
  "patients.view_profile": roles(ALL, ALL, ALL, ALL),
  "patients.edit_information": roles(NONE, ALL, ALL, ALL),
  "patients.update_medical": roles(NONE, ALL, ALL, ALL),
  "patients.view_consultation_history": roles(ALL, ALL, ALL, ALL),
  "patients.view_medical_documents": roles(ALL, ALL, ALL, ALL),

  // Consultations
  "consultations.cards": roles(ALL, ALL, ALL, ALL),
  "consultations.view_patient": roles(ALL, ALL, ALL, ALL),
  "consultations.record_initial_assessment": roles(NONE, ALL, NONE, NONE),
  "consultations.create_record": roles(NONE, NONE, ALL, ALL),
  "consultations.update_record": roles(NONE, NONE, ALL, ALL),
  "consultations.record_diagnosis": roles(NONE, NONE, ALL, ALL),
  "consultations.record_treatment": roles(NONE, NONE, ALL, ALL),
  "consultations.record_prescription": roles(NONE, NONE, ALL, ALL),
  "consultations.complete": roles(NONE, NONE, ALL, ALL),
  "consultations.generate_certificate": roles(NONE, NONE, ALL, NONE),

  // Medical Certificates
  "certificates.summary_cards": roles(ALL, VIEW, ALL, ALL),
  "certificates.search_patient": roles(ALL, VIEW, ALL, ALL),
  "certificates.view_history": roles(ALL, VIEW, ALL, ALL),
  "certificates.generate": roles(ALL, NONE, ALL, ALL),
  "certificates.preview": roles(ALL, NONE, ALL, ALL),
  "certificates.print": roles(ALL, NONE, ALL, ALL),
  "certificates.download_pdf": roles(ALL, NONE, ALL, ALL),

  // Reports
  "reports.summary_cards": roles(ALL, VIEW, VIEW, VIEW),
  "reports.filters": roles(ALL, ALL, ALL, ALL),
  "reports.charts": roles(ALL, VIEW, VIEW, VIEW),
  "reports.consultation": roles(ALL, ALL, ALL, ALL),
  "reports.certificate": roles(ALL, VIEW, ALL, ALL),
  "reports.export_pdf": roles(ALL, VIEW, VIEW, VIEW),
  "reports.export_excel": roles(ALL, NONE, NONE, NONE),

  // Announcements
  "announcements.cards": roles(ALL, ALL, ALL, ALL),
  "announcements.table": roles(ALL, ALL, ALL, ALL),
  "announcements.add": roles(ALL, NONE, NONE, NONE),
  "announcements.edit": roles(ALL, NONE, NONE, NONE),
  "announcements.delete": roles(ALL, NONE, NONE, NONE),
  "announcements.publish": roles(ALL, NONE, NONE, NONE),

  // User Management
  "users.summary_cards": roles(ALL, NONE, NONE, NONE),
  "users.table": roles(ALL, NONE, NONE, NONE),
  "users.add": roles(ALL, NONE, NONE, NONE),
  "users.edit": roles(ALL, NONE, NONE, NONE),
  "users.reset_password": roles(ALL, NONE, NONE, NONE),
  "users.activate": roles(ALL, NONE, NONE, NONE),
  "users.delete": roles(ALL, NONE, NONE, NONE),

  // Settings
  "settings.clinic": roles(ALL, NONE, NONE, NONE),
  "settings.queue": roles(ALL, NONE, NONE, NONE),
  "settings.notification": roles(ALL, NONE, NONE, NONE),
  "settings.security": roles(ALL, NONE, NONE, NONE),
  "settings.system": roles(ALL, NONE, NONE, NONE),
  "settings.profile": roles(ALL, VIEW, VIEW, VIEW),
}

const MODULE_PERMISSIONS: Record<NavModule, Permission[]> = {
  dashboard: [
    "dashboard.cards",
    "dashboard.recent_requests",
    "dashboard.live_queue",
    "dashboard.consultation_statistics",
    "dashboard.recent_activities",
  ],
  consultation_requests: [
    "requests.summary_cards",
    "requests.search_filters",
    "requests.table",
    "requests.view_patient_details",
    "requests.approve",
    "requests.decline",
    "requests.reschedule",
  ],
  queue_management: [
    "queue.summary_cards",
    "queue.table",
    "queue.register_walk_in",
    "queue.verify_check_in",
    "queue.call_next",
    "queue.skip",
    "queue.mark_complete",
  ],
  patient_records: [
    "patients.summary_cards",
    "patients.search",
    "patients.table",
    "patients.view_profile",
    "patients.edit_information",
    "patients.update_medical",
    "patients.view_consultation_history",
    "patients.view_medical_documents",
  ],
  consultations: [
    "consultations.cards",
    "consultations.view_patient",
    "consultations.record_initial_assessment",
    "consultations.create_record",
    "consultations.update_record",
    "consultations.record_diagnosis",
    "consultations.record_treatment",
    "consultations.record_prescription",
    "consultations.complete",
    "consultations.generate_certificate",
  ],
  medical_certificates: [
    "certificates.summary_cards",
    "certificates.search_patient",
    "certificates.view_history",
    "certificates.generate",
    "certificates.preview",
    "certificates.print",
    "certificates.download_pdf",
  ],
  reports: [
    "reports.summary_cards",
    "reports.filters",
    "reports.charts",
    "reports.consultation",
    "reports.certificate",
    "reports.export_pdf",
    "reports.export_excel",
  ],
  announcements: [
    "announcements.cards",
    "announcements.table",
    "announcements.add",
    "announcements.edit",
    "announcements.delete",
    "announcements.publish",
  ],
  user_management: [
    "users.summary_cards",
    "users.table",
    "users.add",
    "users.edit",
    "users.reset_password",
    "users.activate",
    "users.delete",
  ],
  settings: [
    "settings.clinic",
    "settings.queue",
    "settings.notification",
    "settings.security",
    "settings.system",
    "settings.profile",
  ],
}

function asStaffRole(
  designation: ClinicDesignation
): StaffClinicRole | null {
  if (designation === "queue_display") return null
  return designation
}

export function getAccessLevel(
  designation: ClinicDesignation,
  permission: Permission
): AccessLevel {
  const role = asStaffRole(designation)
  if (!role) return NONE
  return MATRIX[permission][role]
}

export function can(
  designation: ClinicDesignation,
  permission: Permission
): boolean {
  return getAccessLevel(designation, permission) !== NONE
}

export function canMutate(
  designation: ClinicDesignation,
  permission: Permission
): boolean {
  return getAccessLevel(designation, permission) === ALL
}

export function canViewModule(
  designation: ClinicDesignation,
  module: NavModule
): boolean {
  return MODULE_PERMISSIONS[module].some((permission) =>
    can(designation, permission)
  )
}

export function permissionsForModule(module: NavModule): Permission[] {
  return MODULE_PERMISSIONS[module]
}
