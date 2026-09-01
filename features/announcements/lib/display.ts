import type { ClinicDesignation } from "@/lib/auth/types"
import {
  ANNOUNCEMENT_AUDIENCES,
  type Announcement,
  type AnnouncementAudience,
} from "@/types/announcement"

const AUDIENCE_SET = new Set<string>(ANNOUNCEMENT_AUDIENCES)

/**
 * Audiences a staff role may see on the published feed. `null` = all.
 * Student, Faculty, and Employee are reserved for future patient-app delivery and are
 * excluded from clinical reader feeds (admin/publishers see all in management).
 */
export function visibleAudiencesForRole(
  designation: ClinicDesignation | null | undefined
): AnnouncementAudience[] | null {
  switch (designation) {
    case "admin":
      return null
    case "nurse":
      return ["All", "Nurse"]
    case "physician":
      return ["All", "Physician"]
    case "dentist":
      return ["All", "Dentist"]
    default:
      return ["All"]
  }
}

export function canViewAnnouncementAudience(
  designation: ClinicDesignation | null | undefined,
  audience: string
): boolean {
  const allowed = visibleAudiencesForRole(designation)
  if (allowed === null) return true
  return allowed.includes(audience as AnnouncementAudience)
}

export function isAnnouncementAudience(value: string): value is AnnouncementAudience {
  return AUDIENCE_SET.has(value)
}

export function announcementCoverUrl(
  announcement: Pick<Announcement, "attachments">
): string | null {
  const image = announcement.attachments.find(
    (item) => item.kind === "image" && item.url
  )
  return image?.url ?? null
}

export function announcementExcerpt(body: string, maxLength = 140): string {
  const plain = body.replace(/\s+/g, " ").trim()
  if (!plain) return ""
  if (plain.length <= maxLength) return plain
  return `${plain.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`
}
