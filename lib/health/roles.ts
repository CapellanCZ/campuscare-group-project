import type { ClinicDesignation } from "@/lib/auth/types"
import type { StationId } from "@/lib/health/types"
import { can, canMutate } from "@/lib/auth/permissions"

export function canMutateQueue(designation: ClinicDesignation) {
  return (
    can(designation, "queue.call_next") ||
    can(designation, "queue.skip") ||
    can(designation, "queue.mark_complete")
  )
}

export function canRegisterWalkIn(designation: ClinicDesignation) {
  return can(designation, "queue.register_walk_in")
}

export function canVerifyCheckIn(designation: ClinicDesignation) {
  return can(designation, "queue.verify_check_in")
}

export function canApproveConsultationRequest(designation: ClinicDesignation) {
  return can(designation, "requests.approve")
}

export function canTransferQueue(designation: ClinicDesignation) {
  // Manual queue transfers: physician ↔ dentist ↔ nurse (not nurse menu).
  return designation === "physician" || designation === "dentist"
}

/** Stations this role may transfer a ticket to from the queue actions menu. */
export function transferTargetsForDesignation(
  designation: ClinicDesignation
): StationId[] {
  if (designation === "physician") return ["dentist", "nurse"]
  if (designation === "dentist") return ["physician", "nurse"]
  // Nurse uses intake "Send to" — no redundant transfer menu items.
  return []
}

export function isReadOnlyQueue(designation: ClinicDesignation) {
  return (
    designation === "queue_display" ||
    (!canMutateQueue(designation) &&
      !canRegisterWalkIn(designation) &&
      !canVerifyCheckIn(designation))
  )
}

export function stationForDesignation(
  designation: ClinicDesignation
): StationId | null {
  if (designation === "physician") return "physician"
  if (designation === "dentist") return "dentist"
  if (designation === "nurse") return "nurse"
  return null
}

export function stationLabel(station: StationId) {
  if (station === "nurse") return "Nurse"
  if (station === "physician") return "Physician"
  return "Dentist"
}

export function designationLabel(designation: ClinicDesignation) {
  switch (designation) {
    case "admin":
      return "Admin"
    case "nurse":
      return "Nurse"
    case "physician":
      return "Physician"
    case "dentist":
      return "Dentist"
    case "queue_display":
      return "Queue Display"
  }
}

export { can, canMutate }
