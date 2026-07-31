import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  attachmentKindFromMime,
  sanitizeFileName,
  validateAttachmentFile,
} from "@/lib/attachments/file-types"
import { getStaffAccess } from "@/lib/auth/access"
import { canMutate } from "@/lib/auth/permissions"
import { createClient } from "@/lib/supabase/server"
import {
  AnnouncementServiceError,
  type AnnouncementAttachment,
  type AnnouncementAttachmentKind,
} from "@/types/announcement"

export const ANNOUNCEMENT_ATTACHMENTS_BUCKET = "announcement-attachments"

type AttachmentRow = {
  id: string
  announcement_id: string
  file_name: string
  file_path: string
  file_size: number | string
  mime_type: string
  kind: string
  uploaded_by: string | null
  created_at: string
}

function mapAttachment(row: AttachmentRow): AnnouncementAttachment {
  const kind: AnnouncementAttachmentKind =
    row.kind === "image" ? "image" : "document"
  return {
    id: row.id,
    announcementId: row.announcement_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: Number(row.file_size) || 0,
    mimeType: row.mime_type,
    kind,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  }
}

async function getClient(client?: SupabaseClient) {
  return client ?? (await createClient())
}

async function requireAdminUserId(client: SupabaseClient): Promise<string> {
  const access = await getStaffAccess()
  if (!access || !canMutate(access.designation, "announcements.add")) {
    throw new AnnouncementServiceError(
      "permission",
      "Only clinic admins can manage announcement attachments."
    )
  }
  const {
    data: { user },
    error,
  } = await client.auth.getUser()
  if (error || !user) {
    throw new AnnouncementServiceError(
      "permission",
      "You must be signed in to manage attachments."
    )
  }
  return user.id
}

export async function listAnnouncementAttachments(
  announcementId: string,
  client?: SupabaseClient
): Promise<AnnouncementAttachment[]> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("announcement_attachments")
    .select("*")
    .eq("announcement_id", announcementId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new AnnouncementServiceError("database", error.message)
  }

  return ((data ?? []) as AttachmentRow[]).map(mapAttachment)
}

export async function listAnnouncementAttachmentsForIds(
  announcementIds: string[],
  client?: SupabaseClient
): Promise<Map<string, AnnouncementAttachment[]>> {
  const map = new Map<string, AnnouncementAttachment[]>()
  if (announcementIds.length === 0) return map

  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from("announcement_attachments")
    .select("*")
    .in("announcement_id", announcementIds)
    .order("created_at", { ascending: true })

  if (error) {
    throw new AnnouncementServiceError("database", error.message)
  }

  for (const row of (data ?? []) as AttachmentRow[]) {
    const attachment = mapAttachment(row)
    const list = map.get(attachment.announcementId) ?? []
    list.push(attachment)
    map.set(attachment.announcementId, list)
  }
  return map
}

export async function signAnnouncementAttachmentUrls(
  attachments: AnnouncementAttachment[],
  client?: SupabaseClient,
  expiresIn = 60 * 60
): Promise<AnnouncementAttachment[]> {
  if (attachments.length === 0) return attachments
  const supabase = await getClient(client)

  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await supabase.storage
        .from(ANNOUNCEMENT_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachment.filePath, expiresIn)
      if (error || !data?.signedUrl) {
        return { ...attachment, url: null }
      }
      return { ...attachment, url: data.signedUrl }
    })
  )
}

export async function uploadAnnouncementAttachments(
  announcementId: string,
  files: File[],
  client?: SupabaseClient
): Promise<AnnouncementAttachment[]> {
  if (files.length === 0) return []

  const supabase = await getClient(client)
  const userId = await requireAdminUserId(supabase)
  const uploaded: AnnouncementAttachment[] = []

  for (const file of files) {
    const validationError = validateAttachmentFile(file)
    if (validationError) {
      throw new AnnouncementServiceError("validation", validationError)
    }

    const safeName = sanitizeFileName(file.name)
    const path = `${announcementId}/${crypto.randomUUID()}-${safeName}`
    const mime = file.type
    const kind = attachmentKindFromMime(mime)
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(ANNOUNCEMENT_ATTACHMENTS_BUCKET)
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
      })

    if (uploadError) {
      throw new AnnouncementServiceError(
        "database",
        uploadError.message || "Failed to upload attachment."
      )
    }

    const { data, error } = await supabase
      .from("announcement_attachments")
      .insert({
        announcement_id: announcementId,
        file_name: safeName,
        file_path: path,
        file_size: file.size,
        mime_type: mime,
        kind,
        uploaded_by: userId,
      })
      .select("*")
      .single()

    if (error) {
      await supabase.storage.from(ANNOUNCEMENT_ATTACHMENTS_BUCKET).remove([path])
      throw new AnnouncementServiceError("database", error.message)
    }

    uploaded.push(mapAttachment(data as AttachmentRow))
  }

  return uploaded
}

export async function deleteAnnouncementAttachment(
  attachmentId: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = await getClient(client)
  await requireAdminUserId(supabase)

  const { data, error } = await supabase
    .from("announcement_attachments")
    .select("*")
    .eq("id", attachmentId)
    .maybeSingle()

  if (error) {
    throw new AnnouncementServiceError("database", error.message)
  }
  if (!data) {
    throw new AnnouncementServiceError("not_found", "Attachment not found.")
  }

  const row = data as AttachmentRow
  await supabase.storage
    .from(ANNOUNCEMENT_ATTACHMENTS_BUCKET)
    .remove([row.file_path])

  const { error: deleteError } = await supabase
    .from("announcement_attachments")
    .delete()
    .eq("id", attachmentId)

  if (deleteError) {
    throw new AnnouncementServiceError("database", deleteError.message)
  }
}

export async function deleteAllAnnouncementAttachments(
  announcementId: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = await getClient(client)
  const attachments = await listAnnouncementAttachments(announcementId, supabase)
  if (attachments.length === 0) return

  const paths = attachments.map((item) => item.filePath)
  await supabase.storage.from(ANNOUNCEMENT_ATTACHMENTS_BUCKET).remove(paths)
  await supabase
    .from("announcement_attachments")
    .delete()
    .eq("announcement_id", announcementId)
}
