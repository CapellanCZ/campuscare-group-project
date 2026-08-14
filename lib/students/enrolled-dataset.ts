import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  ENROLLED_DATASET_CACHE_TTL_MS,
  STUDENT_DATASET_BUCKET,
  STUDENT_DATASET_OBJECT,
} from "@/lib/students/config"
import {
  isCampusRosterMatrix,
  mapCampusRosterRowToStudent,
  normalizeStudentId,
} from "@/lib/students/campus-roster-parse"
import type { EnrolledStudent } from "@/lib/students/types"

export { normalizeStudentId }

type DatasetCache = {
  loadedAt: number
  storageUpdatedAt: string | null
  byId: Map<string, EnrolledStudent>
  list: EnrolledStudent[]
}

let cache: DatasetCache | null = null

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

  const byId = new Map<string, EnrolledStudent>()
  const start = isCampusRosterMatrix(rows) ? 2 : 1
  for (let i = start; i < rows.length; i += 1) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    const student = mapCampusRosterRowToStudent(row)
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
