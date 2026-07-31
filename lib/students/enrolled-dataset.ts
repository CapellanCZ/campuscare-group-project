import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  ENROLLED_DATASET_CACHE_TTL_MS,
  STUDENT_DATASET_BUCKET,
  STUDENT_DATASET_OBJECT,
} from "@/lib/students/config"
import type { EnrolledStudent } from "@/lib/students/types"

/** Column indexes on the real header row (row index 1). */
const COL = {
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

type DatasetCache = {
  loadedAt: number
  storageUpdatedAt: string | null
  byId: Map<string, EnrolledStudent>
  list: EnrolledStudent[]
}

let cache: DatasetCache | null = null

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
  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

function rowToStudent(row: unknown[]): EnrolledStudent | null {
  const studentId = normalizeStudentId(cell(row, COL.studentId))
  if (!studentId) return null

  const firstName = cell(row, COL.firstName)
  const lastName = cell(row, COL.lastName)
  if (!firstName || !lastName) return null

  return {
    studentId,
    department: emptyToNull(cell(row, COL.department)),
    course: emptyToNull(cell(row, COL.course)),
    lastName,
    firstName,
    middleName: emptyToNull(cell(row, COL.middleName)),
    suffix: emptyToNull(cell(row, COL.suffix)),
    birthDate: normalizeBirthDate(cell(row, COL.birthDate)),
    gender: emptyToNull(cell(row, COL.gender)),
    civilStatus: emptyToNull(cell(row, COL.civilStatus)),
    religion: emptyToNull(cell(row, COL.religion)),
    mobile: emptyToNull(cell(row, COL.mobile)),
    email: emptyToNull(cell(row, COL.email))?.toLowerCase() ?? null,
    presentAddress: composeAddress(
      cell(row, COL.presentStreet),
      cell(row, COL.presentBarangay),
      cell(row, COL.presentCity),
      cell(row, COL.presentProvince),
      cell(row, COL.presentPostal),
      cell(row, COL.presentCountry)
    ),
    familyBackground: {
      guardianName: emptyToNull(cell(row, COL.guardianName)),
      relationship: emptyToNull(cell(row, COL.relationship)),
      occupation: emptyToNull(cell(row, COL.occupation)),
      address: emptyToNull(cell(row, COL.guardianAddress)),
      mobile: emptyToNull(cell(row, COL.guardianMobile)),
      email: emptyToNull(cell(row, COL.guardianEmail))?.toLowerCase() ?? null,
    },
  }
}

async function fetchStorageUpdatedAt(
  admin: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(STUDENT_DATASET_BUCKET)
    .list("", {
      search: STUDENT_DATASET_OBJECT,
      limit: 20,
    })

  if (error || !data) return null
  const match = data.find((item) => item.name === STUDENT_DATASET_OBJECT)
  return match?.updated_at ?? match?.created_at ?? null
}

async function downloadAndParse(): Promise<{
  byId: Map<string, EnrolledStudent>
  list: EnrolledStudent[]
  storageUpdatedAt: string | null
}> {
  const admin = createAdminClient()
  const storageUpdatedAt = await fetchStorageUpdatedAt(admin)

  const { data, error } = await admin.storage
    .from(STUDENT_DATASET_BUCKET)
    .download(STUDENT_DATASET_OBJECT)

  if (error || !data) {
    throw new Error(
      error?.message ||
        `Could not download enrolled students file from “${STUDENT_DATASET_BUCKET}/${STUDENT_DATASET_OBJECT}”.`
    )
  }

  const buffer = await data.arrayBuffer()
  const XLSX = await import("xlsx")
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { byId: new Map(), list: [], storageUpdatedAt }
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
  })

  // Row 0 = section titles, row 1 = real headers, data from row 2+
  const byId = new Map<string, EnrolledStudent>()
  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    const student = rowToStudent(row)
    if (!student) continue
    byId.set(normalizeStudentId(student.studentId), student)
  }

  const list = [...byId.values()].sort((a, b) => {
    const byLast = a.lastName.localeCompare(b.lastName)
    if (byLast !== 0) return byLast
    const byFirst = a.firstName.localeCompare(b.firstName)
    if (byFirst !== 0) return byFirst
    return a.studentId.localeCompare(b.studentId)
  })

  return { byId, list, storageUpdatedAt }
}

async function getDatasetCache(): Promise<DatasetCache> {
  const now = Date.now()
  if (cache && now - cache.loadedAt < ENROLLED_DATASET_CACHE_TTL_MS) {
    return cache
  }

  // Soft invalidate when Storage updated_at changes
  if (cache) {
    try {
      const admin = createAdminClient()
      const updatedAt = await fetchStorageUpdatedAt(admin)
      if (
        updatedAt &&
        cache.storageUpdatedAt &&
        updatedAt === cache.storageUpdatedAt &&
        now - cache.loadedAt < ENROLLED_DATASET_CACHE_TTL_MS * 2
      ) {
        cache.loadedAt = now
        return cache
      }
    } catch {
      // Fall through to full download
    }
  }

  const parsed = await downloadAndParse()
  cache = {
    loadedAt: now,
    storageUpdatedAt: parsed.storageUpdatedAt,
    byId: parsed.byId,
    list: parsed.list,
  }
  return cache
}

export async function listEnrolledStudents(): Promise<EnrolledStudent[]> {
  const dataset = await getDatasetCache()
  return dataset.list
}

export async function lookupEnrolledStudentById(
  studentId: string
): Promise<EnrolledStudent | null> {
  const id = normalizeStudentId(studentId)
  if (!id) return null
  const dataset = await getDatasetCache()
  return dataset.byId.get(id) ?? null
}

/** Test helper / forced refresh after Storage upload. */
export function clearEnrolledDatasetCache() {
  cache = null
}
