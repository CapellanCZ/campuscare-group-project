"use client"

import { IconArrowUp, IconX } from "@tabler/icons-react"
import { useEffect, useRef } from "react"

import { AnnouncementAttachmentsView } from "@/components/announcements/announcement-attachments-view"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { announcementCoverUrl } from "@/features/announcements/lib/display"
import { formatAnnouncementDateTime } from "@/features/announcements/lib/format"
import type { Announcement } from "@/types/announcement"

function bodyParagraphs(body: string): string[] {
  const trimmed = body.trim()
  if (!trimmed) return []
  return trimmed.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
}

export function AnnouncementArticleDialog({
  announcement,
  open,
  onOpenChange,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}: {
  announcement: Announcement | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit?: boolean
  canDelete?: boolean
  onEdit?: (announcement: Announcement) => void
  onDelete?: (announcement: Announcement) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: 0 })
  }, [open, announcement?.id])

  if (!announcement) return null

  const cover = announcementCoverUrl(announcement)
  const paragraphs = bodyParagraphs(announcement.body)
  const documentAttachments = (announcement.attachments ?? []).filter(
    (item) => item.kind !== "image"
  )
  const publishedLabel = formatAnnouncementDateTime(
    announcement.publishedAt ?? announcement.updatedAt
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92vh,920px)] w-full max-w-4xl flex-col gap-0 overflow-hidden border-0 p-0 sm:max-w-4xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription>
            Published announcement for {announcement.audience}
          </DialogDescription>
        </DialogHeader>

        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {canEdit && onEdit ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onEdit(announcement)}
            >
              Edit
            </Button>
          ) : null}
          {canDelete && onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onDelete(announcement)}
            >
              Delete
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="bg-background/90 backdrop-blur"
            onClick={() => onOpenChange(false)}
            aria-label="Close announcement"
          >
            <IconX className="size-4" />
          </Button>
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
          <header className="relative isolate min-h-[220px] overflow-hidden bg-slate-900 sm:min-h-[280px]">
            {cover ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt=""
                  className="absolute inset-0 size-full scale-110 object-cover blur-2xl brightness-[0.45]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/70" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
            )}

            <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-end gap-3 px-6 py-8 sm:min-h-[280px] sm:px-10 sm:py-10">
              <p className="text-xs tracking-wide text-white/70 uppercase">
                {announcement.audience}
                {publishedLabel !== "—" ? ` · ${publishedLabel}` : ""}
              </p>
              <h2 className="max-w-3xl text-2xl leading-tight font-semibold text-balance text-white sm:text-3xl">
                {announcement.title}
              </h2>
            </div>
          </header>

          <article className="bg-background px-6 py-8 sm:px-10 sm:py-10">
            {cover ? (
              <figure className="mx-auto mb-8 max-w-3xl overflow-hidden rounded-sm border border-border/60 bg-muted shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt=""
                  className="mx-auto block max-h-[520px] w-full object-contain"
                />
              </figure>
            ) : null}

            <div className="mx-auto max-w-2xl space-y-5">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 24)}`}
                    className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90"
                  >
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No body yet.</p>
              )}

              <p className="pt-2 text-xs text-muted-foreground">
                Posted by {announcement.author.fullName}
              </p>
            </div>

            {documentAttachments.length > 0 ? (
              <div className="mx-auto mt-2 max-w-2xl">
                <AnnouncementAttachmentsView attachments={documentAttachments} />
              </div>
            ) : null}
          </article>

          <div className="sticky bottom-4 flex justify-end px-4 pb-2">
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="shadow-md"
              onClick={() =>
                scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
              }
              aria-label="Back to top"
            >
              <IconArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
