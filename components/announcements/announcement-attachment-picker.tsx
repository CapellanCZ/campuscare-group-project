"use client"

import { useEffect, useMemo, useState } from "react"
import {
  IconFile,
  IconFileTypePdf,
  IconPhoto,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  ATTACHMENT_ACCEPT,
  extensionIconLabel,
  formatFileSize,
  isImageMime,
  validateAttachmentFile,
} from "@/lib/attachments/file-types"
import { cn } from "@/lib/utils"
import type { AnnouncementAttachment } from "@/types/announcement"

export type PendingAttachment = {
  key: string
  file: File
  previewUrl: string | null
  status: "ready" | "error"
  error?: string
}

function FileGlyph({ fileName, mimeType }: { fileName: string; mimeType: string }) {
  if (isImageMime(mimeType)) {
    return <IconPhoto className="size-5 text-muted-foreground" />
  }
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    return <IconFileTypePdf className="size-5 text-muted-foreground" />
  }
  return (
    <div className="flex size-9 flex-col items-center justify-center rounded-md border bg-muted/40">
      <IconFile className="size-3.5 text-muted-foreground" />
      <span className="text-[9px] font-medium text-muted-foreground">
        {extensionIconLabel(fileName)}
      </span>
    </div>
  )
}

export function AnnouncementAttachmentPicker({
  existing,
  pending,
  onPendingChange,
  removedIds,
  onRemovedIdsChange,
  disabled,
}: {
  existing: AnnouncementAttachment[]
  pending: PendingAttachment[]
  onPendingChange: (files: PendingAttachment[]) => void
  removedIds: string[]
  onRemovedIdsChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const visibleExisting = useMemo(
    () => existing.filter((item) => !removedIds.includes(item.id)),
    [existing, removedIds]
  )

  useEffect(() => {
    return () => {
      for (const item of pending) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      }
    }
  }, [pending])

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const next: PendingAttachment[] = [...pending]
    for (const file of Array.from(fileList)) {
      const error = validateAttachmentFile(file)
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: isImageMime(file.type) ? URL.createObjectURL(file) : null,
        status: error ? "error" : "ready",
        error: error ?? undefined,
      })
    }
    onPendingChange(next)
  }

  function removePending(key: string) {
    const target = pending.find((item) => item.key === key)
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
    onPendingChange(pending.filter((item) => item.key !== key))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Attachments</p>
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <IconUpload className="size-3.5" />
          Upload files
          <input
            type="file"
            className="sr-only"
            accept={ATTACHMENT_ACCEPT}
            multiple
            disabled={disabled}
            onChange={(event) => {
              addFiles(event.target.files)
              event.target.value = ""
            }}
          />
        </label>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        PNG, JPG, WEBP, PDF, DOC, DOCX, XLS, XLSX · max 15 MB each
      </p>

      {visibleExisting.length === 0 && pending.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
          No attachments yet
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleExisting.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border px-3 py-3"
            >
              {item.kind === "image" && item.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.fileName}
                  className="size-10 rounded-md object-cover"
                />
              ) : (
                <FileGlyph fileName={item.fileName} mimeType={item.mimeType} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.fileSize)} · saved
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => onRemovedIdsChange([...removedIds, item.id])}
                aria-label={`Remove ${item.fileName}`}
              >
                <IconTrash className="size-4" />
              </Button>
            </li>
          ))}

          {pending.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-xl border px-3 py-3"
            >
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="size-10 rounded-md object-cover"
                />
              ) : (
                <FileGlyph fileName={item.file.name} mimeType={item.file.type} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p
                  className={cn(
                    "text-xs",
                    item.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {formatFileSize(item.file.size)} ·{" "}
                  {item.status === "error" ? item.error : "ready to upload"}
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabled}
                onClick={() => removePending(item.key)}
                aria-label={`Remove ${item.file.name}`}
              >
                <IconX className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
