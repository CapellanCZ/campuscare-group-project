"use server"

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  getAnnouncementStats,
  publishAnnouncement,
  searchAnnouncements,
  updateAnnouncement,
} from "@/services/announcements"
import {
  AnnouncementServiceError,
  type Announcement,
  type AnnouncementListParams,
  type AnnouncementListResult,
  type AnnouncementStats,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from "@/types/announcement"

export type AnnouncementActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string }

function toErrorResult(error: unknown): AnnouncementActionResult<never> {
  if (error instanceof AnnouncementServiceError) {
    return { ok: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("failed to fetch")
    ) {
      return {
        ok: false,
        error:
          "Unable to reach the database. Check your connection and try again.",
        code: "offline",
      }
    }
    return { ok: false, error: error.message, code: "unknown" }
  }
  return {
    ok: false,
    error: "Something went wrong while loading announcements.",
    code: "unknown",
  }
}

export async function fetchAnnouncementsAction(
  params: AnnouncementListParams = {}
): Promise<AnnouncementActionResult<AnnouncementListResult>> {
  try {
    const data = await getAnnouncements(params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function searchAnnouncementsAction(
  query: string,
  params: Omit<AnnouncementListParams, "query"> = {}
): Promise<AnnouncementActionResult<AnnouncementListResult>> {
  try {
    const data = await searchAnnouncements(query, params)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchAnnouncementByIdAction(
  id: string
): Promise<AnnouncementActionResult<Announcement>> {
  try {
    const data = await getAnnouncementById(id)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function fetchAnnouncementStatsAction(): Promise<
  AnnouncementActionResult<AnnouncementStats>
> {
  try {
    const data = await getAnnouncementStats()
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function createAnnouncementAction(
  input: CreateAnnouncementInput
): Promise<AnnouncementActionResult<Announcement>> {
  try {
    const data = await createAnnouncement(input)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function updateAnnouncementAction(
  input: UpdateAnnouncementInput
): Promise<AnnouncementActionResult<Announcement>> {
  try {
    const data = await updateAnnouncement(input)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function publishAnnouncementAction(
  id: string
): Promise<AnnouncementActionResult<Announcement>> {
  try {
    const data = await publishAnnouncement(id)
    return { ok: true, data }
  } catch (error) {
    return toErrorResult(error)
  }
}

export async function deleteAnnouncementAction(
  id: string
): Promise<AnnouncementActionResult<{ id: string }>> {
  try {
    await deleteAnnouncement(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return toErrorResult(error)
  }
}
