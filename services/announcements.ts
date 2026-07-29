import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { CAMPUS_CLINIC_ID, resolveCampusClinicId } from "@/lib/auth/campus-clinic"
import { createClient } from "@/lib/supabase/server"
import {
  ANNOUNCEMENT_STATUSES,
  AnnouncementServiceError,
  type Announcement,
  type AnnouncementListParams,
  type AnnouncementListResult,
  type AnnouncementSortField,
  type AnnouncementStats,
  type AnnouncementStatus,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from "@/types/announcement"

type AuthorJoin = {
  id: string
  full_name: string | null
  email: string | null
}

type AnnouncementRow = {
  id: string
  clinic_id: string
  title: string
  body: string
  audience: string
  status: string
  author_id: string
  published_at: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
  users: AuthorJoin | AuthorJoin[] | null
}

const DEFAULT_PAGE_SIZE = 10

const SELECT_WITH_AUTHOR = `
  id,
  clinic_id,
  title,
  body,
  audience,
  status,
  author_id,
  published_at,
  scheduled_at,
  created_at,
  updated_at,
  users!announcements_author_id_fkey (
    id,
    full_name,
    email
  )
`

function isStatus(value: string): value is AnnouncementStatus {
  return (ANNOUNCEMENT_STATUSES as readonly string[]).includes(value)
}

function mapError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase()
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    throw new AnnouncementServiceError(
      "offline",
      "Unable to reach the database. Check your connection and try again."
    )
  }
  if (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    throw new AnnouncementServiceError(
      "permission",
      "You do not have permission to manage announcements."
    )
  }
  if (error.code === "PGRST116" || message.includes("0 rows")) {
    throw new AnnouncementServiceError(
      "not_found",
      "Announcement not found."
    )
  }
  throw new AnnouncementServiceError(
    "database",
    error.message || "A database error occurred while loading announcements."
  )
}

function authorJoin(value: AuthorJoin | AuthorJoin[] | null): AuthorJoin | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapAnnouncement(row: AnnouncementRow): Announcement {
  if (!isStatus(row.status)) {
    throw new AnnouncementServiceError(
      "database",
      `Unexpected announcement status: ${row.status}`
    )
  }

  const author = authorJoin(row.users)

  return {
    id: row.id,
    clinicId: row.clinic_id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    status: row.status,
    authorId: row.author_id,
    author: {
      id: author?.id ?? row.author_id,
      fullName: author?.full_name?.trim() || author?.email || "Clinic staff",
      email: author?.email ?? null,
    },
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function matchesQuery(announcement: Announcement, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const haystack = [
    announcement.title,
    announcement.body,
    announcement.audience,
    announcement.status,
    announcement.author.fullName,
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(q)
}

function sortValue(
  announcement: Announcement,
  sortBy: AnnouncementSortField
): string | number {
  switch (sortBy) {
    case "published_at":
      return announcement.publishedAt
        ? Date.parse(announcement.publishedAt)
        : 0
    case "created_at":
      return Date.parse(announcement.createdAt)
    case "title":
      return announcement.title.toLowerCase()
    case "status":
      return announcement.status
    case "updated_at":
    default:
      return Date.parse(announcement.updatedAt)
  }
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function requireUserId(client: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error || !user) {
    throw new AnnouncementServiceError(
      "permission",
      "You must be signed in to manage announcements."
    )
  }

  return user.id
}

function validateTitle(title: string) {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new AnnouncementServiceError("validation", "Title is required.")
  }
  if (trimmed.length > 200) {
    throw new AnnouncementServiceError(
      "validation",
      "Title must be 200 characters or fewer."
    )
  }
  return trimmed
}

function validateAudience(audience: string) {
  const trimmed = audience.trim() || "All students"
  if (trimmed.length > 120) {
    throw new AnnouncementServiceError(
      "validation",
      "Audience must be 120 characters or fewer."
    )
  }
  return trimmed
}

function validateStatusTimes(
  status: AnnouncementStatus,
  scheduledAt: string | null | undefined
): { scheduledAt: string | null; publishedAt: string | null } {
  if (status === "scheduled") {
    if (!scheduledAt) {
      throw new AnnouncementServiceError(
        "validation",
        "Scheduled announcements need a schedule date."
      )
    }
    const date = new Date(scheduledAt)
    if (Number.isNaN(date.getTime())) {
      throw new AnnouncementServiceError(
        "validation",
        "Schedule date is invalid."
      )
    }
    return { scheduledAt: date.toISOString(), publishedAt: null }
  }

  if (status === "published") {
    return {
      scheduledAt: scheduledAt ?? null,
      publishedAt: new Date().toISOString(),
    }
  }

  return { scheduledAt: scheduledAt ?? null, publishedAt: null }
}

export async function getAnnouncements(
  params: AnnouncementListParams = {},
  client?: SupabaseClient
): Promise<AnnouncementListResult> {
  const supabase = await getClient(client)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const sortBy = params.sortBy ?? "updated_at"
  const sortDirection = params.sortDirection ?? "desc"
  const query = params.query?.trim() ?? ""
  const status = params.status ?? "all"

  let request = supabase.from("announcements").select(SELECT_WITH_AUTHOR)

  if (status !== "all") {
    request = request.eq("status", status)
  }

  const { data, error } = await request

  if (error) mapError(error)

  let items = ((data ?? []) as AnnouncementRow[]).map(mapAnnouncement)

  if (query) {
    items = items.filter((item) => matchesQuery(item, query))
  }

  items.sort((a, b) => {
    const left = sortValue(a, sortBy)
    const right = sortValue(b, sortBy)
    if (left === right) {
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    }
    if (typeof left === "number" && typeof right === "number") {
      return sortDirection === "asc" ? left - right : right - left
    }
    const cmp = String(left).localeCompare(String(right))
    return sortDirection === "asc" ? cmp : -cmp
  })

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

export async function searchAnnouncements(
  query: string,
  params: Omit<AnnouncementListParams, "query"> = {},
  client?: SupabaseClient
): Promise<AnnouncementListResult> {
  return getAnnouncements({ ...params, query }, client)
}

export async function getAnnouncementById(
  id: string,
  client?: SupabaseClient
): Promise<Announcement> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("announcements")
    .select(SELECT_WITH_AUTHOR)
    .eq("id", id)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new AnnouncementServiceError("not_found", "Announcement not found.")
  }

  return mapAnnouncement(data as AnnouncementRow)
}

export async function getAnnouncementStats(
  client?: SupabaseClient
): Promise<AnnouncementStats> {
  const supabase = await getClient(client)
  const { data, error } = await supabase.from("announcements").select("status")

  if (error) mapError(error)

  let published = 0
  let scheduled = 0
  let drafts = 0

  for (const row of data ?? []) {
    const status = row.status as string
    if (status === "published") published += 1
    else if (status === "scheduled") scheduled += 1
    else if (status === "draft") drafts += 1
  }

  return {
    published,
    scheduled,
    drafts,
    total: (data ?? []).length,
  }
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
  client?: SupabaseClient
): Promise<Announcement> {
  const supabase = await getClient(client)
  const authorId = await requireUserId(supabase)
  const clinicId =
    (await resolveCampusClinicId(supabase)) ?? CAMPUS_CLINIC_ID

  const title = validateTitle(input.title)
  const body = (input.body ?? "").trim()
  const audience = validateAudience(input.audience ?? "All students")
  const status = input.status ?? "draft"
  if (!isStatus(status)) {
    throw new AnnouncementServiceError("validation", "Invalid status.")
  }

  const times = validateStatusTimes(status, input.scheduledAt)

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      clinic_id: clinicId,
      title,
      body,
      audience,
      status,
      author_id: authorId,
      published_at: times.publishedAt,
      scheduled_at: times.scheduledAt,
    })
    .select(SELECT_WITH_AUTHOR)
    .single()

  if (error) mapError(error)
  return mapAnnouncement(data as AnnouncementRow)
}

export async function updateAnnouncement(
  input: UpdateAnnouncementInput,
  client?: SupabaseClient
): Promise<Announcement> {
  const supabase = await getClient(client)

  if (!input.id) {
    throw new AnnouncementServiceError(
      "validation",
      "Announcement id is required."
    )
  }

  const existing = await getAnnouncementById(input.id, supabase)
  const nextStatus = input.status ?? existing.status
  if (!isStatus(nextStatus)) {
    throw new AnnouncementServiceError("validation", "Invalid status.")
  }

  const nextScheduledAt =
    input.scheduledAt !== undefined
      ? input.scheduledAt
      : existing.scheduledAt

  const times = validateStatusTimes(nextStatus, nextScheduledAt)

  const patch: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) patch.title = validateTitle(input.title)
  if (input.body !== undefined) patch.body = input.body.trim()
  if (input.audience !== undefined) {
    patch.audience = validateAudience(input.audience)
  }
  if (input.status !== undefined || input.scheduledAt !== undefined) {
    patch.status = nextStatus
    patch.scheduled_at = times.scheduledAt
    if (nextStatus === "published") {
      patch.published_at =
        existing.publishedAt ?? times.publishedAt ?? new Date().toISOString()
    } else {
      patch.published_at = null
    }
  }

  const { data, error } = await supabase
    .from("announcements")
    .update(patch)
    .eq("id", input.id)
    .select(SELECT_WITH_AUTHOR)
    .maybeSingle()

  if (error) mapError(error)
  if (!data) {
    throw new AnnouncementServiceError("not_found", "Announcement not found.")
  }

  return mapAnnouncement(data as AnnouncementRow)
}

export async function publishAnnouncement(
  id: string,
  client?: SupabaseClient
): Promise<Announcement> {
  return updateAnnouncement(
    {
      id,
      status: "published",
    },
    client
  )
}

export async function deleteAnnouncement(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = await getClient(client)
  const { error, count } = await supabase
    .from("announcements")
    .delete({ count: "exact" })
    .eq("id", id)

  if (error) mapError(error)
  if (!count) {
    throw new AnnouncementServiceError("not_found", "Announcement not found.")
  }
}
