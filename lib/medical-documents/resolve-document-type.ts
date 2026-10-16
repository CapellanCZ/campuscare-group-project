import {
  DOCUMENT_TYPE_LABELS,
  MEDICAL_DOCUMENT_TYPES,
  type MedicalDocumentType,
} from "@/types/medicalDocument"

function isDocumentType(value: string): value is MedicalDocumentType {
  return (MEDICAL_DOCUMENT_TYPES as readonly string[]).includes(value)
}

/** Infer type from legacy / display certificate_type text. */
export function inferDocumentTypeFromCertificateType(
  certificateType: string | null | undefined
): MedicalDocumentType | null {
  const lower = (certificateType ?? "").trim().toLowerCase()
  if (!lower) return null

  for (const [type, label] of Object.entries(DOCUMENT_TYPE_LABELS)) {
    if (label.toLowerCase() === lower) return type as MedicalDocumentType
  }

  // certificateTypeLabel() uses slightly different casing than DOCUMENT_TYPE_LABELS
  if (lower === "medical certificate" || lower === "medical certification") {
    return "medical_certification"
  }
  if (lower.includes("prescription") || lower.startsWith("rx")) {
    return "prescription"
  }
  if (lower.includes("go home") || lower.includes("may go home")) {
    return "go_home_slip"
  }
  if (lower.includes("nfg")) return "nfg_medical_clearance"
  if (lower.includes("certif")) return "medical_certification"
  return null
}

/** Infer type from stored payload shape when document_type was defaulted incorrectly. */
export function inferDocumentTypeFromPayload(
  payload: Record<string, unknown> | null | undefined
): MedicalDocumentType | null {
  if (!payload || typeof payload !== "object") return null

  if (
    Array.isArray(payload.medications) ||
    (payload.diagnosticRequests &&
      typeof payload.diagnosticRequests === "object")
  ) {
    return "prescription"
  }
  if (
    "clearanceStatus" in payload ||
    "medicalHistory" in payload ||
    "sport" in payload
  ) {
    return "nfg_medical_clearance"
  }
  if (
    "releaseDate" in payload ||
    "prescribedMedication" in payload ||
    ("reason" in payload && !("purposeCategory" in payload))
  ) {
    return "go_home_slip"
  }
  if (
    "purposeCategory" in payload ||
    "certificationStatus" in payload ||
    "treatmentSuggested" in payload
  ) {
    return "medical_certification"
  }
  return null
}

/**
 * Resolve the real document type for label + preview.
 * Migration defaulted many rows to medical_certification while certificate_type
 * / payload still identify Prescription (and other) documents.
 */
export function resolveMedicalDocumentType(input: {
  documentType?: string | null
  certificateType?: string | null
  payload?: Record<string, unknown> | null
}): MedicalDocumentType {
  const fromColumn =
    input.documentType && isDocumentType(input.documentType)
      ? input.documentType
      : null
  const fromCertificate = inferDocumentTypeFromCertificateType(
    input.certificateType
  )
  const fromPayload = inferDocumentTypeFromPayload(input.payload)

  // Prefer non-default signals over the migration/column default.
  if (fromCertificate && fromCertificate !== "medical_certification") {
    return fromCertificate
  }
  if (fromPayload && fromPayload !== "medical_certification") {
    return fromPayload
  }
  if (fromColumn) return fromColumn
  if (fromPayload) return fromPayload
  if (fromCertificate) return fromCertificate
  return "medical_certification"
}
