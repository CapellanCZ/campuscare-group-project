/**
 * Campus IDs look like `2026-045210` (students: 4-digit year + 6 digits)
 * or `2026-00100` (faculty/employees: 4-digit year + 5 digits).
 * Legacy faculty/employee IDs `26-00100` normalize to `2026-00100`.
 * Search inputs accept digits only and auto-insert the dash for display.
 * Max digit length is 12 (11–12 digit searches are supported).
 *
 * IMPORTANT: Live typing must never rewrite a modern year prefix (e.g. 2026 → 2020).
 * Legacy `20YY` expansion only runs on complete legacy forms, never on partial modern IDs.
 */

export type CampusIdKind = "student" | "faculty" | "employee" | "any"

export const STUDENT_ID_VALIDATION_MESSAGE =
  "Student ID must contain numbers only."

export const CAMPUS_ID_VALIDATION_MESSAGE =
  "ID Number must contain numbers only."

export const CAMPUS_ID_MAX_DIGITS_MESSAGE =
  "ID number must not exceed 12 digits."

/** Absolute max digits for campus IDs in search/registration (11 or 12 are valid). */
export const CAMPUS_ID_MAX_DIGITS = 12

function maxDigitsFor(kind?: CampusIdKind | null): number {
  // Walk-in / search always allow up to 12 so typing is never truncated mid-entry
  // when patient type flips between student and employee.
  if (kind === "faculty" || kind === "employee") return CAMPUS_ID_MAX_DIGITS
  return CAMPUS_ID_MAX_DIGITS
}

function suffixDigitsFor(kind?: CampusIdKind | null): number {
  if (kind === "faculty" || kind === "employee") return 8
  return 8
}

/** Display maxLength = digits + optional dash. */
export function campusIdInputMaxLength(kind?: CampusIdKind | null): number {
  return maxDigitsFor(kind) + 1
}

/**
 * True when bare digits already look like a modern YYYY… campus ID
 * (including partial years like 2026…), not a 7-digit legacy YYXXXXX.
 */
export function looksLikePartialModernYearDigits(digits: string): boolean {
  return digits.length >= 4 && /^(19|20)\d{2}/.test(digits)
}

/**
 * Normalize faculty/employee ID Numbers to `YYYY-#####` when the value is a
 * *complete* legacy form. Never rewrite partial modern year IDs
 * (avoids flipping `2026…` → `2020-…` via `20` + first-two-digits).
 */
export function normalizeEmployeeCampusId(
  raw: string | null | undefined
): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return ""

  // Already canonical YYYY-##### (employee) or YYYY-######… (student-ish)
  if (/^\d{4}-\d{5,8}$/.test(trimmed)) return trimmed

  // Complete legacy YY-##### only
  if (/^\d{2}-\d{5}$/.test(trimmed)) return `20${trimmed}`

  const digits = trimmed.replace(/\D/g, "")

  // Never rewrite anything that already starts with a modern century year.
  if (looksLikePartialModernYearDigits(digits)) {
    if (digits.length <= 4) return digits
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }

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

/**
 * Live-typing formatter: digits only, max 12, dash after year.
 * Does **not** apply legacy `20`+YY expansion (that caused year flips while typing).
 * Complete legacy `YY-#####` pastes are expanded once.
 */
export function formatCampusIdInput(
  raw: string,
  kind?: CampusIdKind | null
): string {
  const trimmed = raw.trim()

  // Complete legacy paste only (not partial typing)
  if (
    (kind === "faculty" ||
      kind === "employee" ||
      kind === "any" ||
      !kind) &&
    /^\d{2}-\d{5}$/.test(trimmed)
  ) {
    return `20${trimmed}`
  }

  const digits = raw.replace(/\D/g, "").slice(0, maxDigitsFor(kind))
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

/** Strip non-digits and format as `YYYY-######…` (max 12 digits). */
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

/** Digits-only length of a campus ID field value. */
export function campusIdDigitCount(value: string): number {
  return value.replace(/\D/g, "").length
}

/** True when search/register digit length is allowed (0 blank, or 1–12). */
export function isCampusIdDigitLengthAllowed(value: string): boolean {
  return campusIdDigitCount(value) <= CAMPUS_ID_MAX_DIGITS
}

/**
 * Walk-in / ID lookup should wait until the user has enough digits
 * (11 or 12). Avoids mid-typing fetches that race with input state.
 */
export function isCampusIdReadyForLookup(value: string): boolean {
  const n = campusIdDigitCount(value)
  return n >= 11 && n <= CAMPUS_ID_MAX_DIGITS
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
  // Allow legacy YY-##### while pasting for faculty/employee
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
  const digits = studentIdDigits(trimmed)
  if (digits) {
    variants.add(digits)
    if (digits.length > 4) {
      variants.add(`${digits.slice(0, 4)}-${digits.slice(4)}`)
    }
  }
  // Only expand complete legacy forms — never partial modern years.
  if (/^\d{2}-\d{5}$/.test(trimmed) || (/^\d{7}$/.test(digits) && !looksLikePartialModernYearDigits(digits))) {
    const employee = normalizeEmployeeCampusId(trimmed)
    if (employee) variants.add(employee)
  } else if (/^\d{4}-\d{5}$/.test(trimmed)) {
    variants.add(trimmed)
    if (trimmed.startsWith("20")) variants.add(trimmed.slice(2))
  }
  return [...variants]
}
