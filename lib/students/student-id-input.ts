/**
 * Campus IDs look like `2026-045210` (students: 4-digit year + 6 digits)
 * or `2026-00100` (faculty/employees: 4-digit year + 5 digits).
 * Legacy faculty/employee IDs `26-00100` normalize to `2026-00100`.
 * Search inputs accept digits only and auto-insert the dash for display.
 */

export type CampusIdKind = "student" | "faculty" | "employee" | "any"

export const STUDENT_ID_VALIDATION_MESSAGE =
  "Student ID must contain numbers only."

export const CAMPUS_ID_VALIDATION_MESSAGE =
  "ID Number must contain numbers only."

function maxDigitsFor(kind?: CampusIdKind | null): number {
  if (kind === "faculty" || kind === "employee") return 9
  return 10
}

function suffixDigitsFor(kind?: CampusIdKind | null): number {
  if (kind === "faculty" || kind === "employee") return 5
  return 6
}

/**
 * Normalize faculty/employee ID Numbers to `YYYY-#####`.
 * Converts legacy `26-00000` / `2600000` → `2026-00000`.
 * Leaves student-style and other values unchanged when they are not legacy employee forms.
 */
export function normalizeEmployeeCampusId(
  raw: string | null | undefined
): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return ""

  // Already canonical YYYY-#####
  if (/^\d{4}-\d{5}$/.test(trimmed)) return trimmed

  // Legacy YY-#####
  if (/^\d{2}-\d{5}$/.test(trimmed)) return `20${trimmed}`

  const digits = trimmed.replace(/\D/g, "")

  // Bare 7-digit legacy YYXXXXX → 20YY-XXXXX
  if (/^\d{7}$/.test(digits)) {
    return `20${digits.slice(0, 2)}-${digits.slice(2)}`
  }

  // Bare 9-digit YYYYXXXXX → YYYY-XXXXX
  if (/^\d{9}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }

  return trimmed
}

/** Strip non-digits and format as `YYYY-#####` / `YYYY-######`. */
export function formatCampusIdInput(
  raw: string,
  kind?: CampusIdKind | null
): string {
  const trimmed = raw.trim()

  // Paste/complete legacy faculty-employee form `26-00000` → `2026-00000`
  if (
    (kind === "faculty" || kind === "employee" || kind === "any" || !kind) &&
    /^\d{2}-\d{5}$/.test(trimmed)
  ) {
    return normalizeEmployeeCampusId(trimmed)
  }

  const digits = raw.replace(/\D/g, "").slice(0, maxDigitsFor(kind))
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

/** Strip non-digits and format as `YYYY-######` (max 10 digits). */
export function formatStudentIdInput(raw: string): string {
  return formatCampusIdInput(raw, "student")
}

export function looksLikeEmployeeCampusId(value: string): boolean {
  return /^\d{4}-\d{5}$/.test(normalizeEmployeeCampusId(value))
}

/** True when the raw keystrokes/paste contained letters, spaces, or symbols. */
export function hasInvalidStudentIdChars(raw: string): boolean {
  return /[^\d-]/.test(raw)
}

/** Formatted value is empty or a plausible partial/complete campus ID. */
export function isStudentIdQuery(value: string): boolean {
  return isCampusIdQuery(value, "student")
}

export function isCampusIdQuery(
  value: string,
  kind?: CampusIdKind | null
): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  // Allow legacy YY-##### while typing/pasting for faculty/employee
  if (
    (kind === "faculty" || kind === "employee" || kind === "any" || !kind) &&
    /^\d{2}(-\d{0,5})?$/.test(trimmed)
  ) {
    return true
  }
  const suffix = suffixDigitsFor(kind)
  return new RegExp(`^\\d{1,4}(-\\d{0,${suffix}})?$`).test(trimmed)
}

/** Digits-only form for matching against stored student IDs. */
export function studentIdDigits(value: string): string {
  return value.replace(/\D/g, "")
}

export function studentIdMatchesQuery(
  studentId: string | null | undefined,
  query: string
): boolean {
  const q = studentIdDigits(query)
  if (!q) return true
  return studentIdDigits(studentId ?? "").includes(q)
}

/**
 * Resolve affiliation from an ID Number for lookup/search.
 * Returns the canonical forms to try against student_id / employee_id columns.
 */
export function campusIdLookupVariants(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  const variants = new Set<string>([trimmed])
  const employee = normalizeEmployeeCampusId(trimmed)
  if (employee) variants.add(employee)
  // Also keep legacy form if user typed canonical (for reverse lookup of unmigrated rows)
  if (/^\d{4}-\d{5}$/.test(employee) && employee.startsWith("20")) {
    variants.add(employee.slice(2))
  }
  return [...variants]
}
