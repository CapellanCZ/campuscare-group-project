/**
 * Official enrolled-students file in Supabase Storage (private bucket).
 * Object: Student Information Dataset (demodata) - Sheet1 (1).csv
 */
export const STUDENT_DATASET_BUCKET =
  process.env.STUDENT_DATASET_BUCKET?.trim() || "Student Dataset"

export const STUDENT_DATASET_OBJECT =
  process.env.STUDENT_DATASET_OBJECT?.trim() ||
  "Student Information Dataset (demodata) - Sheet1 (1).csv"

/** In-memory roster cache TTL (ms). */
export const ENROLLED_DATASET_CACHE_TTL_MS = 5 * 60 * 1000
