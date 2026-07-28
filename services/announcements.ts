import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

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
  profiles: AuthorJoin | AuthorJoin[] | null
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
  profiles:author_id (
    id,
    full_name
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
      "You do not have permission to access announcements."
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

  const author = authorJoin(row.profiles)

  return {
    id: row.id,
    clinicId: row.clinic_id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    status: row.status,
    authorId: row.author_id,
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: author?.id ?? row.author_id,
      fullName: author?.full_name?.trim() || "Clinic Admin",
    },
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
    case "updated_at":
      return Date.parse(announcement.updatedAt)
    case "published_at":
      return announcement.publishedAt ? Date.parse(announcement.publishedAt) : 0
    case "status":
      return announcement.status
    case "title":
      return announcement.title.toLowerCase()
    default:
      return Date.parse(announcement.updatedAt)
  }
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function resolveClinicContext(client: SupabaseClient) {
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    throw new AnnouncementServiceError(
      "permission",
      "You must be signed in to access announcements."
    )
  }

  const { data: membership, error } = await client
    .from("clinic_members")
    .select("clinic_id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (error) mapError(error)
  if (!membership?.clinic_id) {
    throw new AnnouncementServiceError(
      "permission",
      "Your account is not assigned to a clinic yet."
    )
  }

  return { userId: user.id, clinicId: membership.clinic_id as string }
}

async function requireAdmin(client: SupabaseClient) {
  const context = await resolveClinicContext(client)

  const { data: profile, error } = await client
    .from("profiles")
    .select("primary_role")
    .eq("id", context.userId)
    .maybeSingle()

  if (error) mapError(error)
  if (profile?.primary_role !== "admin") {
    throw new AnnouncementServiceError(
      "permission",
      "Only admins can manage announcements."
    )
  }

  return context
}

function normalizeStatusTimestamps(input: {
  status?: AnnouncementStatus
  scheduledAt?: string | null
  publishedAt?: string | null
  existing?: Announcement
}) {
  const status = input.status ?? input.existing?.status ?? "draft"
  const scheduledAt =
    input.scheduledAt !== undefined
      ? input.scheduledAt
      : (input.existing?.scheduledAt ?? null)
  let publishedAt =
    input.publishedAt !== undefined
      ? input.publishedAt
      : (input.existing?.publishedAt ?? null)

  if (status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString()
  }

  return { status, scheduledAt, publishedAt }
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
      return Date.parse(b.createdAt) - Date.parse(a.createdAt)
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
  const { data, error } = await supabase
    .from("announcements")
    .select("status")

  if (error) mapError(error)

  let published = 0
  let scheduled = 0
  let drafts = 0

  for (const row of data ?? []) {
    const status = row.status as string
    if (status === "published") published += 1
    if (status === "scheduled") scheduled += 1
    if (status === "draft") drafts += 1
  }

  return { published, scheduled, drafts }
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
  client?: SupabaseClient
): Promise<Announcement> {
  const supabase = await getClient(client)
  const { userId, clinicId } = await requireAdmin(supabase)

  const title = input.title.trim()
  if (!title) {
    throw new AnnouncementServiceError(
      "validation",
      "Announcement title is required."
    )
  }

  const { status, scheduledAt, publishedAt } = normalizeStatusTimestamps({
    status: input.status,
    scheduledAt: input.scheduledAt,
  })

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      clinic_id: clinicId,
      title,
      body: input.body?.trim() ?? "",
      audience: input.audience?.trim() || "All students",
      status,
      author_id: userId,
      scheduled_at: scheduledAt,
      published_at: publishedAt,
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
  await requireAdmin(supabase)

  if (!input.id) {
    throw new AnnouncementServiceError(
      "validation",
      "Announcement id is required."
    )
  }

  const existing = await getAnnouncementById(input.id, supabase)
  const { status, scheduledAt, publishedAt } = normalizeStatusTimestamps({
    status: input.status,
    scheduledAt: input.scheduledAt,
    publishedAt: input.publishedAt,
    existing,
  })

  const patch: Record<string, string | null> = {}
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.body !== undefined) patch.body = input.body.trim()
  if (input.audience !== undefined) {
    patch.audience = input.audience.trim() || "All students"
  }
  if (input.status !== undefined) patch.status = status
  if (input.scheduledAt !== undefined) patch.scheduled_at = scheduledAt
  if (input.publishedAt !== undefined || input.status === "published") {
    patch.published_at = publishedAt
  }

  if (input.title !== undefined && !patch.title) {
    throw new AnnouncementServiceError(
      "validation",
      "Announcement title is required."
    )
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
      publishedAt: new Date().toISOString(),
    },
    client
  )
}

export async function deleteAnnouncement(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = await getClient(client)
  await requireAdmin(supabase)

  const { error } = await supabase.from("announcements").delete().eq("id", id)

  if (error) mapError(error)
}
