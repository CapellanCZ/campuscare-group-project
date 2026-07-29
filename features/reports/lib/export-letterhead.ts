export const HSO_OFFICE_NAME = "NU DASMARIÑAS"
export const HSO_OFFICE_UNIT = "Health Service Office"
export const HSO_LETTERHEAD_LINE = "NU DASMARIÑAS — Health Service Office"
export const HSO_CONFIDENTIAL =
  "NU Dasmariñas Health Service Office — Confidential"
export const HSO_LOGO_PATH = "/images/HSOLogo.png"
export const HSO_ACCENT = "#1e3a8a"

export type ExportMeta = {
  reportTitle: string
  generatedAt: string
  generatedBy: string
  roleLabel: string
  filterSummary: string
}

export function formatManilaTimestamp(iso = new Date().toISOString()): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function exportFilename(
  reportKind: string,
  extension: "pdf" | "csv" | "xlsx"
): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const kind = reportKind.replace(/[^a-z0-9]+/gi, "_")
  return `HSO_${kind}_${day}.${extension}`
}

export function buildFilterSummary(input: {
  dateFrom: string
  dateTo: string
  consultationType: string
  patientType: string
  assignedPersonnel: string
  status: string
}): string {
  const parts = [
    `Date: ${input.dateFrom} to ${input.dateTo}`,
    `Consultation: ${input.consultationType}`,
    `Patient type: ${
      input.patientType === "faculty"
        ? "Faculty / Employee"
        : input.patientType
    }`,
    `Personnel: ${input.assignedPersonnel}`,
    `Status: ${input.status}`,
  ]
  return parts.join(" · ")
}

export function spreadsheetPreamble(meta: ExportMeta): string[][] {
  return [
    [HSO_LETTERHEAD_LINE],
    [meta.reportTitle],
    [
      `Generated: ${formatManilaTimestamp(meta.generatedAt)} · By: ${meta.generatedBy} (${meta.roleLabel})`,
    ],
    [meta.filterSummary],
    [],
  ]
}
