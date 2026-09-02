/**
 * Campus IDs look like `2026-045210` (students: 4-digit year + 6 digits)
 * or `2026-00100` (faculty/employees: 4-digit year + 5 digits).
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

/** Strip non-digits and format as `YYYY-#####` / `YYYY-######`. */
export function formatCampusIdInput(
  raw: string,
  kind?: CampusIdKind | null
): string {
  const digits = raw.replace(/\D/g, "").slice(0, maxDigitsFor(kind))
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

/** Strip non-digits and format as `YYYY-######` (max 10 digits). */
export function formatStudentIdInput(raw: string): string {
  return formatCampusIdInput(raw, "student")
}

export function looksLikeEmployeeCampusId(value: string): boolean {
  return /^\d{4}-\d{5}$/.test(value.trim())
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
