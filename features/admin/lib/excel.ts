import {
  isCampusRosterMatrix,
  parseCampusRosterMatrix,
} from "@/lib/students/campus-roster-parse"

export type ExcelRow = Record<string, string>

function cellToString(value: unknown): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
}

const HEADER_HINTS = [
  "first_name",
  "last_name",
  "full_name",
  "student_id",
  "student_id_number",
  "id_number",
  "id_no",
  "patient_type",
  "license_no",
  "license_number",
  "role",
  "designation",
  "occupation",
  "email",
  "course",
] as const

function headerScore(cells: unknown[]): number {
  const headers = cells.map(normalizeHeader).filter(Boolean)
  let score = 0
  for (const hint of HEADER_HINTS) {
    if (headers.includes(hint)) score += 2
  }
  // Prefer rows that look like labels, not numeric ids / people names
  if (headers.some((h) => /^(no|name|id)$/.test(h))) score += 1
  return score
}

function detectHeaderRowIndex(matrix: unknown[][]): number {
  const limit = Math.min(5, matrix.length)
  let bestIndex = 0
  let bestScore = -1
  for (let i = 0; i < limit; i += 1) {
    const row = matrix[i]
    if (!Array.isArray(row)) continue
    const score = headerScore(row)
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }
  return bestIndex
}

function matrixToKeyedRows(
  matrix: unknown[][],
  headerRowIndex: number,
  sheetName?: string
): ExcelRow[] {
  const headerRow = matrix[headerRowIndex]
  if (!Array.isArray(headerRow)) return []

  const headers = headerRow.map(normalizeHeader)
  const seen = new Map<string, number>()
  const uniqueHeaders = headers.map((header) => {
    if (!header) return ""
    const count = seen.get(header) ?? 0
    seen.set(header, count + 1)
    return count === 0 ? header : `${header}_${count + 1}`
  })

  const rows: ExcelRow[] = []
  for (let r = headerRowIndex + 1; r < matrix.length; r += 1) {
    const raw = matrix[r]
    if (!Array.isArray(raw)) continue

    const normalized: ExcelRow = {}
    let hasValue = false
    for (let c = 0; c < uniqueHeaders.length; c += 1) {
      const header = uniqueHeaders[c]
      if (!header) continue
      const value = cellToString(raw[c])
      if (value) hasValue = true
      // Keep first non-empty if duplicates somehow collide
      if (!(header in normalized) || !normalized[header]) {
        normalized[header] = value
      }
    }
    if (!hasValue) continue
    if (sheetName) {
      normalized.__import_sheet = sheetName
    }
    rows.push(normalized)
  }
  return rows
}

/** Parse all sheets of an .xlsx / .xls / .csv file into normalized string rows. */
export async function parseExcelRows(buffer: ArrayBuffer): Promise<ExcelRow[]> {
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  if (workbook.SheetNames.length === 0) return []

  const allRows: ExcelRow[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    })

    if (matrix.length === 0) continue

    if (allRows.length === 0 && isCampusRosterMatrix(matrix)) {
      return parseCampusRosterMatrix(matrix)
    }

    const headerRowIndex = detectHeaderRowIndex(matrix)
    allRows.push(...matrixToKeyedRows(matrix, headerRowIndex, sheetName))
  }

  return allRows
}

/** Parse workbook into sheet-name → keyed rows (preserves sheet boundaries). */
export async function parseExcelSheets(
  buffer: ArrayBuffer
): Promise<Map<string, ExcelRow[]>> {
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const sheets = new Map<string, ExcelRow[]>()

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    })
    if (matrix.length === 0) {
      sheets.set(sheetName, [])
      continue
    }
    if (isCampusRosterMatrix(matrix)) {
      sheets.set(sheetName, parseCampusRosterMatrix(matrix))
      continue
    }
    const headerRowIndex = detectHeaderRowIndex(matrix)
    sheets.set(sheetName, matrixToKeyedRows(matrix, headerRowIndex, sheetName))
  }

  return sheets
}

/** Lazy-loads xlsx only when the user downloads a template (keeps page compile light). */
export async function downloadExcelTemplate(
  filename: string,
  headers: string[],
  sampleRows: string[][] = []
) {
  await downloadExcelData(filename, headers, sampleRows, "Import")
}

/** Write an Excel workbook from header + data rows (client-side download). */
export async function downloadExcelData(
  filename: string,
  headers: string[],
  rows: string[][],
  sheetName = "Sheet1"
) {
  await downloadExcelWorkbook(filename, [{ name: sheetName, headers, rows }])
}

/** Write a multi-sheet Excel workbook (client-side download). */
export async function downloadExcelWorkbook(
  filename: string,
  sheets: Array<{ name: string; headers: string[]; rows: string[][] }>
) {
  const XLSX = await import("xlsx")
  const workbook = XLSX.utils.book_new()
  const usedNames = new Set<string>()

  for (const sheet of sheets) {
    const baseName = sheet.name.replace(/[\\/?*[\]]/g, "").slice(0, 31) || "Sheet"
    let name = baseName
    let suffix = 2
    while (usedNames.has(name)) {
      const trimmed = baseName.slice(0, Math.max(1, 31 - String(suffix).length - 1))
      name = `${trimmed}_${suffix}`
      suffix += 1
    }
    usedNames.add(name)
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows])
    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  }

  XLSX.writeFile(workbook, filename)
}
