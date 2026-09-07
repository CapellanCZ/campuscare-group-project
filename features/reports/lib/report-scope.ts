import type { ClinicDesignation } from "@/lib/auth/types"

export function reportsPageTitle(_designation: ClinicDesignation): string {
  return "Reports and Analytics"
}

export function reportsScopeLabel(
  designation: ClinicDesignation
): string | null {
  if (designation === "physician") return "Medical"
  if (designation === "dentist") return "Dental"
  return null
}

export function exportReportTitle(designation: ClinicDesignation): string {
  if (designation === "physician") {
    return "Medical Consultation & Health Cases Report"
  }
  if (designation === "dentist") {
    return "Dental Consultation & Health Cases Report"
  }
  if (designation === "nurse") {
    return "HSO Monthly Summary Report"
  }
  return "HSO Monthly Summary Report"
}

export function isClinicalReportsRole(
  designation: ClinicDesignation
): designation is "physician" | "dentist" {
  return designation === "physician" || designation === "dentist"
}
