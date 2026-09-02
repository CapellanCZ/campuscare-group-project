import {
  STANDARD_DENTAL_CASE_LABELS,
  STANDARD_MEDICAL_CASE_LABELS,
} from "@/features/reports/lib/health-case-normalize"
import type { ReportTableBundle } from "@/features/reports/types"

export function buildOfficialHealthCasesRows(
  table: ReportTableBundle | undefined,
  mode: "medical" | "dental"
): string[][] {
  const standardLabels =
    mode === "dental"
      ? STANDARD_DENTAL_CASE_LABELS
      : STANDARD_MEDICAL_CASE_LABELS

  const byTypeTable = table?.kind === "health_cases_by_patient_type"
  const counts = new Map<
    string,
    { employee: number; college: number; shs: number }
  >()

  for (const row of table?.rows ?? []) {
    const label = String(row.cells.case ?? "")
    if (!label) continue
    if (byTypeTable) {
      counts.set(label, {
        employee: Number(row.cells.employee ?? 0),
        college: Number(row.cells.student ?? 0),
        shs: Number(row.cells.faculty ?? 0),
      })
    } else {
      counts.set(label, {
        employee: Number(row.cells.total ?? 0),
        college: 0,
        shs: 0,
      })
    }
  }

  return standardLabels.map((label) => {
    const bucket = counts.get(label) ?? { employee: 0, college: 0, shs: 0 }
    return [
      label,
      bucket.employee > 0 ? String(bucket.employee) : "—",
      bucket.college > 0 ? String(bucket.college) : "—",
      bucket.shs > 0 ? String(bucket.shs) : "—",
    ]
  })
}
