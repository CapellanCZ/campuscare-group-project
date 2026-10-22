"use client"

import type { ComponentType } from "react"
import {
  IconArrowUp,
  IconCalendarEvent,
  IconPencil,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react"
import { useEffect, useRef, useState } from "react"

import { AnnouncementAttachmentsView } from "@/components/announcements/announcement-attachments-view"
import {
  AnnouncementImageGallery,
  announcementImages,
} from "@/components/announcements/announcement-image-gallery"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatAnnouncementDate } from "@/features/announcements/lib/format"
import { cn } from "@/lib/utils"
import type { Announcement } from "@/types/announcement"

function MetaChip({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; stroke?: number }>
  label: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
      <Icon className="size-3.5 shrink-0 opacity-70" stroke={1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  )
}

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
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: 0 })
    setShowBackToTop(false)
  }, [open, announcement?.id])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!open || !scroller) return

    function onScroll() {
      if (!scroller) return
      setShowBackToTop(scroller.scrollTop > 240)
    }

    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [open, announcement?.id])

  if (!announcement) return null

  const images = announcementImages(announcement.attachments)
  const paragraphs = bodyParagraphs(announcement.body)
  const documentAttachments = (announcement.attachments ?? []).filter(
    (item) => item.kind !== "image"
  )
  const hasAdminActions = (canEdit && onEdit) || (canDelete && onDelete)
  const dateLabel = formatAnnouncementDate(
    announcement.publishedAt ?? announcement.updatedAt
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92vh,880px)] w-full max-w-3xl flex-col gap-0 overflow-hidden border-0 p-0 ring-1 ring-foreground/10 sm:max-w-3xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription>Published announcement</DialogDescription>
        </DialogHeader>

        {/* Toolbar: admin actions grouped; close isolated to avoid mis-taps */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {canEdit && onEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onEdit(announcement)}
              >
                <IconPencil data-icon="inline-start" aria-hidden />
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
                <IconTrash data-icon="inline-start" aria-hidden />
                Delete
              </Button>
            ) : null}
            {!hasAdminActions ? (
              <p className="truncate text-xs text-muted-foreground">
                Announcement
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="shrink-0"
            onClick={() => onOpenChange(false)}
            aria-label="Close announcement"
          >
            <IconX className="size-4" />
          </Button>
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
          <article className="bg-background">
            <header className="border-b border-border/60 px-6 pt-7 pb-6 sm:px-10 sm:pt-9 sm:pb-7">
              <div className="mx-auto flex max-w-2xl flex-col gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <MetaChip icon={IconUsers} label={announcement.audience} />
                  <MetaChip icon={IconCalendarEvent} label={dateLabel} />
                </div>

                <h2 className="max-w-2xl text-2xl leading-[1.2] font-semibold tracking-tight text-balance text-foreground sm:text-[1.75rem]">
                  {announcement.title}
                </h2>

                <p className="text-xs text-muted-foreground">
                  Posted by {announcement.author.fullName}
                </p>
              </div>
            </header>

            <div className="mx-auto max-w-2xl px-6 py-8 sm:px-10 sm:py-10">
              {images.length > 0 ? (
                <div className="mb-7">
                  <AnnouncementImageGallery
                    images={images}
                    className="rounded-xl border-border/50 shadow-none"
                    aspectClassName="aspect-[16/10]"
                  />
                </div>
              ) : null}

              <div className="space-y-5">
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, index) => (
                    <p
                      key={`${index}-${paragraph.slice(0, 24)}`}
                      className="whitespace-pre-wrap text-[15px] leading-7 text-pretty text-foreground/90"
                    >
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No body yet.</p>
                )}
              </div>

              {documentAttachments.length > 0 ? (
                <div className="mt-8 border-t border-border/60 pt-6">
                  <AnnouncementAttachmentsView
                    attachments={documentAttachments}
                  />
                </div>
              ) : null}
            </div>
          </article>

          <div
            className={cn(
              "pointer-events-none sticky bottom-0 flex justify-end px-4 pb-4 transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
              showBackToTop ? "opacity-100" : "opacity-0"
            )}
          >
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className={cn(
                "pointer-events-auto bg-background/95 shadow-sm backdrop-blur",
                !showBackToTop && "invisible"
              )}
              tabIndex={showBackToTop ? 0 : -1}
              onClick={() =>
                scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
              }
              aria-label="Back to top"
              aria-hidden={!showBackToTop}
            >
              <IconArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
