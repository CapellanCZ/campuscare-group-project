import type { EnrolledStudent } from "@/lib/students/types"

/**
 * Column indexes for NU campus student roster sheets:
 * row 0 = section titles (BASIC INFORMATION, …),
 * row 1 = field headers,
 * data from row 2+.
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

export function normalizeStudentId(value: string): string {
  return value.trim()
}

function cell(row: unknown[], index: number): string {
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
  if (Number.isNaN(parsed)) return value
  return new Date(parsed).toISOString().slice(0, 10)
}

function rowCells(row: unknown): unknown[] | null {
  return Array.isArray(row) ? row : null
}

function joinRowText(row: unknown[] | null): string {
  if (!row) return ""
  return row.map((value) => String(value ?? "").trim()).join(" ")
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
  row: unknown[]
): EnrolledStudent | null {
  const studentId = normalizeStudentId(cell(row, CAMPUS_ROSTER_COL.studentId))
  if (!studentId) return null

  const firstName = cell(row, CAMPUS_ROSTER_COL.firstName)
  const lastName = cell(row, CAMPUS_ROSTER_COL.lastName)
  if (!firstName || !lastName) return null

  return {
    studentId,
    department: emptyToNull(cell(row, CAMPUS_ROSTER_COL.department)),
    course: emptyToNull(cell(row, CAMPUS_ROSTER_COL.course)),
    lastName,
    firstName,
    middleName: emptyToNull(cell(row, CAMPUS_ROSTER_COL.middleName)),
    suffix: emptyToNull(cell(row, CAMPUS_ROSTER_COL.suffix)),
    birthDate: normalizeBirthDate(cell(row, CAMPUS_ROSTER_COL.birthDate)),
    gender: emptyToNull(cell(row, CAMPUS_ROSTER_COL.gender)),
    civilStatus: emptyToNull(cell(row, CAMPUS_ROSTER_COL.civilStatus)),
    religion: emptyToNull(cell(row, CAMPUS_ROSTER_COL.religion)),
    mobile: emptyToNull(cell(row, CAMPUS_ROSTER_COL.mobile)),
    email: emptyToNull(cell(row, CAMPUS_ROSTER_COL.email))?.toLowerCase() ?? null,
    presentAddress: composeAddress(
      cell(row, CAMPUS_ROSTER_COL.presentStreet),
      cell(row, CAMPUS_ROSTER_COL.presentBarangay),
      cell(row, CAMPUS_ROSTER_COL.presentCity),
      cell(row, CAMPUS_ROSTER_COL.presentProvince),
      cell(row, CAMPUS_ROSTER_COL.presentPostal),
      cell(row, CAMPUS_ROSTER_COL.presentCountry)
    ),
    familyBackground: {
      guardianName: emptyToNull(cell(row, CAMPUS_ROSTER_COL.guardianName)),
      relationship: emptyToNull(cell(row, CAMPUS_ROSTER_COL.relationship)),
      occupation: emptyToNull(cell(row, CAMPUS_ROSTER_COL.occupation)),
      address: emptyToNull(cell(row, CAMPUS_ROSTER_COL.guardianAddress)),
      mobile: emptyToNull(cell(row, CAMPUS_ROSTER_COL.guardianMobile)),
      email:
        emptyToNull(cell(row, CAMPUS_ROSTER_COL.guardianEmail))?.toLowerCase() ??
        null,
    },
  }
}

/** Canonical import keys for patient_records Excel upsert. */
export function mapCampusRosterRowToImportFields(
  row: unknown[]
): Record<string, string> | null {
  const student = mapCampusRosterRowToStudent(row)
  if (!student) return null

  return {
    patient_type: "student",
    student_id: student.studentId,
    first_name: student.firstName,
    last_name: student.lastName,
    middle_name: student.middleName ?? "",
    course: student.course ?? "",
    department: student.department ?? "",
    birth_date: student.birthDate ?? "",
    gender: student.gender ?? "",
    phone: student.mobile ?? "",
    email: student.email ?? "",
    address: student.presentAddress ?? "",
    emergency_contact_name: student.familyBackground.guardianName ?? "",
    emergency_contact_phone: student.familyBackground.mobile ?? "",
  }
}

export function parseCampusRosterMatrix(
  matrix: unknown[][]
): Record<string, string>[] {
  const out: Record<string, string>[] = []
  for (let i = 2; i < matrix.length; i += 1) {
    const row = rowCells(matrix[i])
    if (!row) continue
    const mapped = mapCampusRosterRowToImportFields(row)
    if (mapped) out.push(mapped)
  }
  return out
}
