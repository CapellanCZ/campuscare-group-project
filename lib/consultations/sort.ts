import {
  normalizeConsultationStatus,
  type Consultation,
  type ConsultationStatus,
} from "@/types/consultation"

/** Waiting first → completed last; other statuses stay between. */
export const CONSULTATION_LIST_STATUS_ORDER: ConsultationStatus[] = [
  "waiting",
  "ongoing",
  "cancelled",
  "completed",
]

const STATUS_LIST_RANK: Record<ConsultationStatus, number> = {
  waiting: 0,
  ongoing: 1,
  cancelled: 2,
  completed: 3,
}

function statusListRank(status: string): number {
  return STATUS_LIST_RANK[normalizeConsultationStatus(status)] ?? 99
}

/**
 * Stable Consultations list order:
 * 1) waiting first, completed last
 * 2) within a status, newest consultation_date first
 * 3) tie-break with updated_at, then id (deterministic across reloads)
 */
export function compareConsultationsForList(
  a: Pick<Consultation, "id" | "status" | "consultationDate" | "updatedAt">,
  b: Pick<Consultation, "id" | "status" | "consultationDate" | "updatedAt">
): number {
  const byStatus = statusListRank(a.status) - statusListRank(b.status)
  if (byStatus !== 0) return byStatus

  const byDate = (b.consultationDate ?? "").localeCompare(
    a.consultationDate ?? ""
  )
  if (byDate !== 0) return byDate

  const byUpdated = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
  if (byUpdated !== 0) return byUpdated

  return a.id.localeCompare(b.id)
}

export function sortConsultationsForList<T extends Pick<
  Consultation,
  "id" | "status" | "consultationDate" | "updatedAt"
>>(items: T[]): T[] {
  return [...items].sort(compareConsultationsForList)
}
