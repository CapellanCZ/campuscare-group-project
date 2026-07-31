"use client"

import { useEffect, useState } from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconX,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  extensionIconLabel,
  formatFileSize,
  isImageMime,
} from "@/lib/attachments/file-types"
import type { AnnouncementAttachment } from "@/types/announcement"

function DocumentIcon({ fileName, mimeType }: { fileName: string; mimeType: string }) {
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

export function AnnouncementAttachmentsView({
  attachments,
}: {
  attachments: AnnouncementAttachment[]
}) {
  const images = attachments.filter((item) => item.kind === "image" && item.url)
  const documents = attachments.filter((item) => item.kind !== "image")
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  useEffect(() => {
    if (previewIndex === null) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPreviewIndex(null)
      if (event.key === "ArrowLeft") {
        setPreviewIndex((current) =>
          current === null ? null : (current - 1 + images.length) % images.length
        )
      }
      if (event.key === "ArrowRight") {
        setPreviewIndex((current) =>
          current === null ? null : (current + 1) % images.length
        )
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [previewIndex, images.length])

  if (attachments.length === 0) return null

  const preview = previewIndex === null ? null : images[previewIndex]

  return (
    <div className="mt-6 space-y-5">
      {images.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Images</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className="overflow-hidden rounded-xl border focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPreviewIndex(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url!}
                  alt={image.fileName}
                  className="aspect-square w-full object-cover transition hover:opacity-90"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Files</p>
          <ul className="space-y-2">
            {documents.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-xl border px-3 py-2"
              >
                <DocumentIcon fileName={file.fileName} mimeType={file.mimeType} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
                {file.url ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    render={
                      <a href={file.url} download={file.fileName} target="_blank" rel="noreferrer" />
                    }
                    nativeButton={false}
                  >
                    <IconDownload className="size-3.5" />
                    Download
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog
        open={previewIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null)
        }}
      >
        <DialogContent
          className="max-w-4xl border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-4xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Image preview</DialogTitle>
            <DialogDescription>
              Larger preview of announcement attachment
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url!}
                alt={preview.fileName}
                className="max-h-[80vh] w-full rounded-2xl object-contain"
              />
              <div className="mt-3 flex items-center justify-between gap-2 text-sm text-white">
                <p className="truncate">{preview.fileName}</p>
                <div className="flex items-center gap-1">
                  {images.length > 1 ? (
                    <>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="secondary"
                        onClick={() =>
                          setPreviewIndex(
                            (previewIndex! - 1 + images.length) % images.length
                          )
                        }
                        aria-label="Previous image"
                      >
                        <IconChevronLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="secondary"
                        onClick={() =>
                          setPreviewIndex((previewIndex! + 1) % images.length)
                        }
                        aria-label="Next image"
                      >
                        <IconChevronRight className="size-4" />
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    onClick={() => setPreviewIndex(null)}
                    aria-label="Close preview"
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function isImageAttachment(attachment: AnnouncementAttachment) {
  return attachment.kind === "image" || isImageMime(attachment.mimeType)
}
