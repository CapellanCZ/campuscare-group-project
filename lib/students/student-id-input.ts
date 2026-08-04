/**
 * Campus student IDs look like `2023-172065` (4-digit year, dash, digits).
 * Search inputs accept digits only and auto-insert the dash for display.
 */

export const STUDENT_ID_VALIDATION_MESSAGE =
  "Student ID must contain numbers only."

/** Strip non-digits and format as `YYYY-######` (max 10 digits). */
export function formatStudentIdInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

/** True when the raw keystrokes/paste contained letters, spaces, or symbols. */
export function hasInvalidStudentIdChars(raw: string): boolean {
  return /[^\d-]/.test(raw)
}

/** Formatted value is empty or a plausible partial/complete campus ID. */
export function isStudentIdQuery(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  return /^\d{1,4}(-\d{0,6})?$/.test(trimmed)
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
