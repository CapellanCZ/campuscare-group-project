import { manilaDayBounds } from "@/lib/health/time"
import type { Consultation } from "@/types/consultation"

/**
 * Consultations tab is an activity log: newest first by consultation_date,
 * then updated_at, then id for stable ties.
 */
export function compareConsultationsForList(
  a: Pick<Consultation, "id" | "consultationDate" | "updatedAt">,
  b: Pick<Consultation, "id" | "consultationDate" | "updatedAt">
): number {
  const byDate = (b.consultationDate ?? "").localeCompare(
    a.consultationDate ?? ""
  )
  if (byDate !== 0) return byDate

  const byUpdated = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
  if (byUpdated !== 0) return byUpdated

  return a.id.localeCompare(b.id)
}

export function sortConsultationsForList<
  T extends Pick<Consultation, "id" | "consultationDate" | "updatedAt">,
>(items: T[]): T[] {
  return [...items].sort(compareConsultationsForList)
}

/** Upcoming consultations: soonest appointment/consultation date first. */
export function compareConsultationsUpcoming(
  a: Pick<Consultation, "id" | "consultationDate" | "updatedAt">,
  b: Pick<Consultation, "id" | "consultationDate" | "updatedAt">
): number {
  const byDate = (a.consultationDate ?? "").localeCompare(
    b.consultationDate ?? ""
  )
  if (byDate !== 0) return byDate
  return a.id.localeCompare(b.id)
}

export function sortConsultationsUpcoming<
  T extends Pick<Consultation, "id" | "consultationDate" | "updatedAt">,
>(items: T[]): T[] {
  return [...items].sort(compareConsultationsUpcoming)
}

export function consultationManilaYmd(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return manilaDayBounds(date).ymd
}

export function partitionConsultationsByDay<
  T extends Pick<Consultation, "consultationDate">,
>(
  items: T[],
  todayYmd = manilaDayBounds().ymd
): { today: T[]; upcoming: T[]; past: T[] } {
  const today: T[] = []
  const upcoming: T[] = []
  const past: T[] = []

  for (const item of items) {
    const ymd = consultationManilaYmd(item.consultationDate)
    if (!ymd || ymd === todayYmd) today.push(item)
    else if (ymd > todayYmd) upcoming.push(item)
    else past.push(item)
  }

  return { today, upcoming, past }
}
