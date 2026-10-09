import type { EnrolledStudent } from "@/lib/students/types"

/**
 * Legacy fixed indexes for older campus sheets (pre–NU Quest ID / Nationality columns).
 * Prefer header-based resolution via `resolveCampusRosterColumns`.
 */
export const CAMPUS_ROSTER_COL = {
  studentId: 1,
  department: 2,
  course: 3,
  lastName: 4,
  firstName: 5,
  middleName: 6,
  suffix: 7,
  birthDate: 9,
  civilStatus: 12,
  gender: 13,
  religion: 14,
  mobile: 15,
  email: 17,
  presentProvince: 18,
  presentCity: 19,
  presentStreet: 20,
  presentBarangay: 21,
  presentPostal: 22,
  presentCountry: 23,
  guardianName: 30,
  relationship: 31,
  occupation: 32,
  guardianAddress: 33,
  guardianMobile: 34,
  guardianEmail: 35,
} as const

/** Current NU campus roster layout (with Nationality + NU Quest ID). */
const CAMPUS_ROSTER_COL_CURRENT = {
  studentId: 1,
  department: 2,
  course: 3,
  lastName: 4,
  firstName: 5,
  middleName: 6,
  suffix: 7,
  nationality: 9,
  birthDate: 10,
  civilStatus: 13,
  gender: 14,
  religion: 15,
  mobile: 16,
  email: 18,
  presentProvince: 19,
  presentCity: 20,
  presentStreet: 21,
  presentBarangay: 22,
  presentPostal: 23,
  presentCountry: 24,
  guardianName: 31,
  relationship: 32,
  occupation: 33,
  guardianAddress: 34,
  guardianMobile: 35,
  guardianEmail: 36,
} as const

export type CampusRosterColumns = {
  studentId: number
  department: number
  course: number
  lastName: number
  firstName: number
  middleName: number
  suffix: number
  nationality: number
  birthDate: number
  civilStatus: number
  gender: number
  religion: number
  mobile: number
  email: number
  presentProvince: number
  presentCity: number
  presentStreet: number
  presentBarangay: number
  presentPostal: number
  presentCountry: number
  guardianName: number
  relationship: number
  occupation: number
  guardianAddress: number
  guardianMobile: number
  guardianEmail: number
}

export function normalizeStudentId(value: string): string {
  return value.trim()
}

function cell(row: unknown[], index: number): string {
  if (index < 0) return ""
  const value = row[index]
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function composeAddress(
  street: string,
  barangay: string,
  city: string,
  province: string,
  postal: string,
  country: string
): string | null {
  const parts = [street, barangay, city, province, postal, country]
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

function normalizeBirthDate(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

function rowCells(row: unknown): unknown[] | null {
  return Array.isArray(row) ? row : null
}

function joinRowText(row: unknown[] | null): string {
  if (!row) return ""
  return row.map((value) => String(value ?? "").trim()).join(" ")
}

function normalizeHeaderLabel(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\w]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function findHeaderIndex(
  headers: string[],
  candidates: string[],
  fromIndex = 0
): number {
  for (let i = Math.max(0, fromIndex); i < headers.length; i += 1) {
    const header = headers[i]
    if (!header) continue
    for (const candidate of candidates) {
      if (header === candidate || header.includes(candidate)) return i
    }
  }
  return -1
}

/**
 * Resolve column indexes from the campus field-header row.
 * Handles both older sheets and current sheets that insert Nationality / NU Quest ID.
 */
export function resolveCampusRosterColumns(
  headerRow: unknown[]
): CampusRosterColumns {
  const headers = headerRow.map(normalizeHeaderLabel)
  const hasNationality = findHeaderIndex(headers, ["nationality"]) >= 0
  const fallback = hasNationality
    ? CAMPUS_ROSTER_COL_CURRENT
    : {
        ...CAMPUS_ROSTER_COL,
        nationality: -1,
      }

  const studentId = findHeaderIndex(headers, [
    "student id number",
    "student id",
  ])
  const firstName = findHeaderIndex(headers, ["first name"])
  const lastName = findHeaderIndex(headers, ["last name"])

  // If core headers are missing, keep a fixed layout fallback.
  if (studentId < 0 || firstName < 0 || lastName < 0) {
    return { ...fallback, nationality: fallback.nationality ?? -1 }
  }

  const birthDate = findHeaderIndex(headers, ["birth date", "date of birth", "dob"])
  const guardianName = findHeaderIndex(headers, [
    "parent guardian name",
    "guardian name",
  ])
  const presentProvince = findHeaderIndex(headers, ["province"])
  const presentCity = findHeaderIndex(
    headers,
    ["city municipality", "city"],
    presentProvince >= 0 ? presentProvince : 0
  )
  const presentStreet = findHeaderIndex(
    headers,
    ["hose no street", "street", "house no"],
    presentProvince >= 0 ? presentProvince : 0
  )
  const presentBarangay = findHeaderIndex(
    headers,
    ["barangay"],
    presentProvince >= 0 ? presentProvince : 0
  )
  const presentPostal = findHeaderIndex(
    headers,
    ["postal code", "postal"],
    presentProvince >= 0 ? presentProvince : 0
  )
  const presentCountry = findHeaderIndex(
    headers,
    ["country"],
    presentProvince >= 0 ? presentProvince : 0
  )

  const guardianMobile =
    guardianName >= 0
      ? findHeaderIndex(headers, ["mobile number", "mobile"], guardianName)
      : findHeaderIndex(headers, ["mobile number", "mobile"])

  const guardianEmail =
    guardianName >= 0
      ? findHeaderIndex(headers, ["email adress", "email address", "email"], guardianName)
      : -1

  // First mobile/email in BASIC INFORMATION (before present address block).
  const mobile = findHeaderIndex(headers, ["mobile number", "mobile"])
  const email = findHeaderIndex(headers, [
    "official email address",
    "email address",
    "email",
  ])

  return {
    studentId,
    department: findHeaderIndex(headers, ["department"]),
    course: findHeaderIndex(headers, ["course"]),
    lastName,
    firstName,
    middleName: findHeaderIndex(headers, ["middle name"]),
    suffix: findHeaderIndex(headers, ["suffix"]),
    nationality: findHeaderIndex(headers, ["nationality"]),
    birthDate: birthDate >= 0 ? birthDate : fallback.birthDate,
    civilStatus: findHeaderIndex(headers, ["civil status"]),
    gender: findHeaderIndex(headers, ["gender", "sex"]),
    religion: findHeaderIndex(headers, ["religion"]),
    mobile: mobile >= 0 ? mobile : fallback.mobile,
    email: email >= 0 ? email : fallback.email,
    presentProvince:
      presentProvince >= 0 ? presentProvince : fallback.presentProvince,
    presentCity: presentCity >= 0 ? presentCity : fallback.presentCity,
    presentStreet: presentStreet >= 0 ? presentStreet : fallback.presentStreet,
    presentBarangay:
      presentBarangay >= 0 ? presentBarangay : fallback.presentBarangay,
    presentPostal: presentPostal >= 0 ? presentPostal : fallback.presentPostal,
    presentCountry:
      presentCountry >= 0 ? presentCountry : fallback.presentCountry,
    guardianName: guardianName >= 0 ? guardianName : fallback.guardianName,
    relationship: findHeaderIndex(headers, [
      "relationship to student",
      "relationship",
    ]),
    occupation:
      guardianName >= 0
        ? findHeaderIndex(headers, ["occupation"], guardianName)
        : findHeaderIndex(headers, ["occupation"]),
    guardianAddress:
      guardianName >= 0
        ? findHeaderIndex(headers, ["address"], guardianName)
        : fallback.guardianAddress,
    guardianMobile:
      guardianMobile >= 0 ? guardianMobile : fallback.guardianMobile,
    guardianEmail: guardianEmail >= 0 ? guardianEmail : fallback.guardianEmail,
  }
}

/** True when the sheet uses the campus two-row header layout. */
export function isCampusRosterMatrix(matrix: unknown[][]): boolean {
  if (matrix.length < 3) return false
  const title = joinRowText(rowCells(matrix[0]))
  const headers = joinRowText(rowCells(matrix[1]))
  return (
    /basic\s+information/i.test(title) &&
    /student\s+id\s+number/i.test(headers) &&
    /first\s+name/i.test(headers) &&
    /last\s+name/i.test(headers)
  )
}

export function mapCampusRosterRowToStudent(
  row: unknown[],
  columns: CampusRosterColumns = {
    ...CAMPUS_ROSTER_COL_CURRENT,
  }
): EnrolledStudent | null {
  const studentId = normalizeStudentId(cell(row, columns.studentId))
  if (!studentId) return null

  const firstName = cell(row, columns.firstName)
  const lastName = cell(row, columns.lastName)
  if (!firstName || !lastName) return null

  return {
    studentId,
    department: emptyToNull(cell(row, columns.department)),
    course: emptyToNull(cell(row, columns.course)),
    lastName,
    firstName,
    middleName: emptyToNull(cell(row, columns.middleName)),
    suffix: emptyToNull(cell(row, columns.suffix)),
    birthDate: normalizeBirthDate(cell(row, columns.birthDate)),
    gender: emptyToNull(cell(row, columns.gender)),
    civilStatus: emptyToNull(cell(row, columns.civilStatus)),
    religion: emptyToNull(cell(row, columns.religion)),
    mobile: emptyToNull(cell(row, columns.mobile)),
    email: emptyToNull(cell(row, columns.email))?.toLowerCase() ?? null,
    presentAddress: composeAddress(
      cell(row, columns.presentStreet),
      cell(row, columns.presentBarangay),
      cell(row, columns.presentCity),
      cell(row, columns.presentProvince),
      cell(row, columns.presentPostal),
      cell(row, columns.presentCountry)
    ),
    familyBackground: {
      guardianName: emptyToNull(cell(row, columns.guardianName)),
      relationship: emptyToNull(cell(row, columns.relationship)),
      occupation: emptyToNull(cell(row, columns.occupation)),
      address: emptyToNull(cell(row, columns.guardianAddress)),
      mobile: emptyToNull(cell(row, columns.guardianMobile)),
      email:
        emptyToNull(cell(row, columns.guardianEmail))?.toLowerCase() ?? null,
    },
  }
}

/** Canonical import keys for patient_records Excel upsert. */
export function mapCampusRosterRowToImportFields(
  row: unknown[],
  columns?: CampusRosterColumns
): Record<string, string> | null {
  const cols = columns ?? { ...CAMPUS_ROSTER_COL_CURRENT }
  const student = mapCampusRosterRowToStudent(row, cols)
  if (!student) return null

  return {
    patient_type: "student",
    student_id: student.studentId,
    id_number: student.studentId,
    first_name: student.firstName,
    last_name: student.lastName,
    middle_name: student.middleName ?? "",
    course: student.course ?? "",
    department: student.department ?? "",
    birth_date: student.birthDate ?? "",
    gender: student.gender ?? "",
    civil_status: student.civilStatus ?? "",
    religion: student.religion ?? "",
    nationality: emptyToNull(cell(row, cols.nationality)) ?? "",
    phone: student.mobile ?? "",
    email: student.email ?? "",
    address: student.presentAddress ?? "",
    emergency_contact_name: student.familyBackground.guardianName ?? "",
    emergency_contact_phone: student.familyBackground.mobile ?? "",
    guardian_relationship: student.familyBackground.relationship ?? "",
    guardian_occupation: student.familyBackground.occupation ?? "",
    guardian_address: student.familyBackground.address ?? "",
    guardian_email: student.familyBackground.email ?? "",
  }
}

export function parseCampusRosterMatrix(
  matrix: unknown[][]
): Record<string, string>[] {
  const headerRow = rowCells(matrix[1]) ?? []
  const columns = resolveCampusRosterColumns(headerRow)
  const out: Record<string, string>[] = []
  for (let i = 2; i < matrix.length; i += 1) {
    const row = rowCells(matrix[i])
    if (!row) continue
    const mapped = mapCampusRosterRowToImportFields(row, columns)
    if (mapped) out.push(mapped)
  }
  return out
}
