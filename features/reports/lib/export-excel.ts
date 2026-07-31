import type { ClinicExportPack } from "@/features/reports/lib/clinic-progress-narrative"
import {
  HSO_LETTERHEAD_LINE,
  exportFilename,
  spreadsheetPreamble,
  type ExportMeta,
} from "@/features/reports/lib/export-letterhead"
import type { ReportTableBundle } from "@/features/reports/types"

export async function downloadClinicProgressExcel(input: {
  meta: ExportMeta
  pack: ClinicExportPack
}): Promise<void> {
  const XLSX = await import("xlsx")
  const workbook = XLSX.utils.book_new()
  const n = input.pack.narrative

  const overview: (string | number)[][] = [
    ...spreadsheetPreamble({
      ...input.meta,
      reportTitle: n.title,
    }),
    ["Coverage period", n.periodLabel],
    [],
    ["1. Executive summary"],
    [n.executiveSummary],
    [],
    ["2. Operational progress"],
    [n.operationalProgress],
    [],
    ["3. Health-related concerns"],
    [n.healthConcerns],
    [],
    ["4. Service capacity & queue situation"],
    [n.serviceCapacity],
    [],
    ["8. Closing note for administration"],
    [n.closing],
  ]
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(overview),
    "Overview"
  )

  const kpiSheet = XLSX.utils.aoa_to_sheet([
    [HSO_LETTERHEAD_LINE],
    ["Analytics snapshot (KPI cards)"],
    [],
    ["KPI", "Value", "Description"],
    ...input.pack.kpis.map((k) => [k.label, k.value, k.description ?? ""]),
  ])
  XLSX.utils.book_append_sheet(workbook, kpiSheet, "KPIs")

  for (const [index, chart] of input.pack.charts.entries()) {
    const sheetName = `Chart${index + 1}`.slice(0, 31)
    const aoa: (string | number)[][] = [
      [chart.title],
      [chart.description ?? ""],
      [],
      ["Category", "Value", "Secondary"],
      ...chart.points.map((p) => [p.label, p.value, p.secondary ?? ""]),
    ]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), sheetName)
  }

  for (const [index, table] of input.pack.tables.entries()) {
    const sheetName = `Table${index + 1}_${table.kind}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 31)
    const aoa: (string | number)[][] = [
      [table.title],
      [],
      table.columns.map((c) => c.label),
      ...table.rows.map((row) =>
        table.columns.map((c) => row.cells[c.key] ?? "")
      ),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws["!cols"] = table.columns.map((c) => ({
      wch: Math.max(12, c.label.length + 4),
    }))
    XLSX.utils.book_append_sheet(workbook, ws, sheetName || `Table${index + 1}`)
  }

  XLSX.writeFile(workbook, exportFilename("Clinic_Progress_Report", "xlsx"))
}

/** @deprecated Prefer downloadClinicProgressExcel */
export async function downloadReportExcel(input: {
  meta: ExportMeta
  table: ReportTableBundle
  reportKindKey: string
  pack?: ClinicExportPack
}): Promise<void> {
  if (input.pack) {
    await downloadClinicProgressExcel({ meta: input.meta, pack: input.pack })
    return
  }
  await downloadClinicProgressExcel({
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
      tables: [input.table],
    },
  })
}
