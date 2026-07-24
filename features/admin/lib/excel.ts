export type ExcelRow = Record<string, string>

function cellToString(value: unknown): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

/** Parse first sheet of an .xlsx / .xls / .csv file into normalized string rows. */
export async function parseExcelRows(buffer: ArrayBuffer): Promise<ExcelRow[]> {
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  })

  return rawRows.map((row) => {
    const normalized: ExcelRow = {}
    for (const [key, value] of Object.entries(row)) {
      const header = key.trim().toLowerCase().replace(/\s+/g, "_")
      if (!header) continue
      normalized[header] = cellToString(value)
    }
    return normalized
  })
}

/** Lazy-loads xlsx only when the user downloads a template (keeps page compile light). */
export async function downloadExcelTemplate(
  filename: string,
  headers: string[],
  sampleRows: string[][] = []
) {
  const XLSX = await import("xlsx")
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Import")
  XLSX.writeFile(workbook, filename)
}
