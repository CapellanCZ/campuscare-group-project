import { formatDiagnosticRequestLines } from "@/lib/medical-documents/diagnostic-request-options"
import type {
  PrescriptionMedication,
  PrescriptionPayload,
} from "@/types/medicalDocument"

export function filledPrescriptionMedications(
  medications: PrescriptionMedication[] | null | undefined
): PrescriptionMedication[] {
  return (medications ?? []).filter((med) => med.name?.trim())
}

function medicationRowTouched(med: PrescriptionMedication): boolean {
  return Boolean(
    med.name?.trim() ||
      med.strength?.trim() ||
      med.quantity?.trim() ||
      med.frequency?.trim() ||
      med.duration?.trim() ||
      med.route?.trim() ||
      med.instructions?.trim()
  )
}

/**
 * Prescription may be medication-only, lab-request-only, or both.
 * Empty prescriptions (neither) are rejected.
 */
export function validatePrescriptionPayload(
  payload: PrescriptionPayload
): string | null {
  const medications = payload.medications ?? []
  for (const med of medications) {
    if (medicationRowTouched(med) && !med.name?.trim()) {
      return "Enter a medication name, or clear unused medication rows."
    }
  }

  const namedMeds = filledPrescriptionMedications(medications)
  const diagnostic = payload.diagnosticRequests
  const diagnosticLines = diagnostic
    ? formatDiagnosticRequestLines(diagnostic)
    : []

  if (
    diagnostic?.selectedIds?.includes("others") &&
    !diagnostic.othersText?.trim()
  ) {
    return "Enter the custom laboratory / diagnostic request."
  }

  if (namedMeds.length === 0 && diagnosticLines.length === 0) {
    return "Add at least one medication or select a laboratory / diagnostic request."
  }

  return null
}

/** Drop blank medication stubs before preview / issue. */
export function sanitizePrescriptionPayload(
  payload: PrescriptionPayload
): PrescriptionPayload {
  return {
    ...payload,
    medications: filledPrescriptionMedications(payload.medications),
  }
}
