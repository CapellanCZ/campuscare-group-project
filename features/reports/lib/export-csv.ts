import type { ClinicExportPack } from "@/features/reports/lib/clinic-progress-narrative"
import {
  exportFilename,
  spreadsheetPreamble,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function pushSection(lines: string[], title: string) {
  lines.push("")
  lines.push(csvEscape(title))
}

export function downloadClinicProgressCsv(input: {
  meta: ExportMeta
  pack: ClinicExportPack
}): void {
  const lines: string[] = []
  for (const row of spreadsheetPreamble(input.meta)) {
    lines.push(row.map((cell) => csvEscape(cell)).join(","))
  }

  const n = input.pack.narrative
  pushSection(lines, "1. EXECUTIVE SUMMARY")
  lines.push(csvEscape(n.executiveSummary))
  pushSection(lines, "2. OPERATIONAL PROGRESS")
  lines.push(csvEscape(n.operationalProgress))
  pushSection(lines, "3. HEALTH-RELATED CONCERNS")
  lines.push(csvEscape(n.healthConcerns))
  pushSection(lines, "4. SERVICE CAPACITY & QUEUE SITUATION")
  lines.push(csvEscape(n.serviceCapacity))

  pushSection(lines, "5. ANALYTICS SNAPSHOT (KPI CARDS)")
  lines.push(["KPI", "Value", "Description"].map(csvEscape).join(","))
  for (const kpi of input.pack.kpis) {
    lines.push(
      [kpi.label, kpi.value, kpi.description ?? ""].map((v) => csvEscape(String(v))).join(",")
    )
  }

  pushSection(lines, "6. CHARTS & VISUAL ANALYTICS (DATA)")
  for (const chart of input.pack.charts) {
    lines.push(csvEscape(`Chart: ${chart.title}`))
    if (chart.description) lines.push(csvEscape(chart.description))
    lines.push(["Category", "Value", "Secondary"].map(csvEscape).join(","))
    for (const point of chart.points) {
      lines.push(
        [point.label, String(point.value), String(point.secondary ?? "")].map(csvEscape).join(",")
      )
    }
    lines.push("")
  }

  pushSection(lines, "7. DETAILED REPORT TABLES")
  for (const table of input.pack.tables) {
    lines.push(csvEscape(table.title))
    lines.push(table.columns.map((c) => csvEscape(c.label)).join(","))
    for (const row of table.rows) {
      lines.push(
        table.columns
          .map((c) => csvEscape(String(row.cells[c.key] ?? "")))
          .join(",")
      )
    }
    lines.push("")
  }

  pushSection(lines, "8. CLOSING NOTE")
  lines.push(csvEscape(n.closing))

  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = exportFilename("Clinic_Progress_Report", "csv")
  a.click()
  URL.revokeObjectURL(url)
}

/** @deprecated Prefer downloadClinicProgressCsv */
export function downloadReportCsv(input: {
  meta: ExportMeta
  table: { title?: string; columns: { key: string; label: string }[]; rows: { cells: Record<string, string | number> }[] }
  reportKindKey: string
  pack?: ClinicExportPack
}): void {
  if (input.pack) {
    downloadClinicProgressCsv({ meta: input.meta, pack: input.pack })
    return
  }
  downloadClinicProgressCsv({
    meta: input.meta,
    pack: {
      narrative: {
        title: input.meta.reportTitle,
        periodLabel: "",
        executiveSummary: "",
        operationalProgress: "",
        healthConcerns: "",
        serviceCapacity: "",
        closing: "",
      },
      kpis: [],
      charts: [],
      tables: [
        {
          kind: "daily_consultation",
          title: input.table.title ?? "Report",
          columns: input.table.columns,
          rows: input.table.rows.map((r, i) => ({
            id: String(i),
            cells: r.cells,
          })),
        },
      ],
    },
  })
}
