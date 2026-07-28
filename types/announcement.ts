export const ANNOUNCEMENT_STATUSES = [
  "draft",
  "scheduled",
  "published",
] as const

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]

export const ANNOUNCEMENT_AUDIENCES = [
  "All students",
  "All campus",
  "Clinic staff",
  "Dental queue",
  "Nurse queue",
  "Physician queue",
] as const

export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number]

export type AnnouncementAuthor = {
  id: string
  fullName: string
}

export type Announcement = {
  id: string
  clinicId: string
  title: string
  body: string
  audience: string
  status: AnnouncementStatus
  authorId: string
  publishedAt: string | null
  scheduledAt: string | null
  createdAt: string
  updatedAt: string
  author: AnnouncementAuthor
}

export type AnnouncementStats = {
  published: number
  scheduled: number
  drafts: number
}

export type AnnouncementSortField = "updated_at" | "published_at" | "status" | "title"

export type AnnouncementSortDirection = "asc" | "desc"

export type AnnouncementListParams = {
  query?: string
  page?: number
  pageSize?: number
  sortBy?: AnnouncementSortField
  sortDirection?: AnnouncementSortDirection
  status?: AnnouncementStatus | "all"
}

export type AnnouncementListResult = {
  items: Announcement[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateAnnouncementInput = {
  title: string
  body?: string
  audience?: string
  status?: AnnouncementStatus
  scheduledAt?: string | null
}

export type UpdateAnnouncementInput = {
  id: string
  title?: string
  body?: string
  audience?: string
  status?: AnnouncementStatus
  scheduledAt?: string | null
  publishedAt?: string | null
}

export type AnnouncementServiceErrorCode =
  | "offline"
  | "permission"
  | "not_found"
  | "validation"
  | "database"
  | "unknown"

export class AnnouncementServiceError extends Error {
  readonly code: AnnouncementServiceErrorCode

  constructor(code: AnnouncementServiceErrorCode, message: string) {
    super(message)
    this.name = "AnnouncementServiceError"
    this.code = code
  }
}
