import type { MedicalDocumentStatus } from "@/types/medicalDocument"
import { normalizeDocumentStatus } from "@/types/medicalDocument"

export { normalizeDocumentStatus }

export function documentStatusLabel(status: MedicalDocumentStatus | string) {
  const normalized = normalizeDocumentStatus(status)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function documentStatusVariant(
  status: MedicalDocumentStatus | string
): "default" | "secondary" | "outline" | "destructive" {
  const normalized = normalizeDocumentStatus(status)
  if (normalized === "issued") return "default"
  if (normalized === "voided") return "destructive"
  if (normalized === "draft" || normalized === "pending") return "secondary"
  return "outline"
}

export const DOCUMENT_STATUS_FILTER_OPTIONS = (
  ["draft", "pending", "issued", "voided"] as const
).map((status) => ({
  value: status,
  label: documentStatusLabel(status),
}))
