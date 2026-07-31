/** Shared helpers for clinic file attachments (announcements + consultation requests). */

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const

export const ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.xls,.xlsx"

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

export type AttachmentKind = "image" | "document"

export function isImageMime(mime: string): boolean {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mime)
}

export function attachmentKindFromMime(mime: string): AttachmentKind {
  return isImageMime(mime) ? "image" : "document"
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[\\/]+/g, "-")
  return trimmed.slice(0, 180) || "file"
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size <= 0) return "File is empty."
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "File must be 15 MB or smaller."
  }
  const mime = file.type || ""
  if (!(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mime)) {
    return "Unsupported file type. Use PNG, JPG, WEBP, PDF, DOC, DOCX, XLS, or XLSX."
  }
  return null
}

export function extensionIconLabel(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase() ?? "FILE"
  if (ext === "JPEG") return "JPG"
  return ext.slice(0, 4)
}
