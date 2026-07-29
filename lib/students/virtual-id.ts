export const ENROLLED_VIRTUAL_ID_PREFIX = "enrolled:"

export function enrolledVirtualId(studentId: string): string {
  return `${ENROLLED_VIRTUAL_ID_PREFIX}${studentId.trim()}`
}

export function isEnrolledVirtualId(id: string): boolean {
  return id.startsWith(ENROLLED_VIRTUAL_ID_PREFIX)
}

export function studentIdFromVirtualId(id: string): string | null {
  if (!isEnrolledVirtualId(id)) return null
  const studentId = id.slice(ENROLLED_VIRTUAL_ID_PREFIX.length).trim()
  return studentId || null
}
