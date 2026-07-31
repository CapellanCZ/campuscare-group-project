"use client"

import { AnnouncementAttachmentsView } from "@/components/announcements/announcement-attachments-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  announcementStatusLabel,
  formatAnnouncementDateTime,
} from "@/features/announcements/lib/format"
import type { Announcement, AnnouncementStatus } from "@/types/announcement"

function statusVariant(
  status: AnnouncementStatus
): "default" | "secondary" | "outline" {
  if (status === "published") return "default"
  if (status === "scheduled") return "secondary"
  return "outline"
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 border-b py-4 last:border-b-0 sm:grid-cols-[160px_1fr] sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-relaxed text-foreground">{value}</dd>
    </div>
  )
}

export function AnnouncementDetailSheet({
  announcement,
  open,
  onOpenChange,
  canEdit,
  canPublish,
  canDelete,
  onEdit,
  onPublish,
  onDelete,
}: {
  announcement: Announcement | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit: boolean
  canPublish: boolean
  canDelete: boolean
  onEdit: (announcement: Announcement) => void
  onPublish: (announcement: Announcement) => void
  onDelete: (announcement: Announcement) => void
}) {
  if (!announcement) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col data-[side=right]:sm:max-w-2xl sm:max-w-2xl">
        <SheetHeader className="gap-2">
          <SheetTitle className="pr-8">{announcement.title}</SheetTitle>
          <SheetDescription>
            Posted for {announcement.audience}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="mb-5">
            <Badge variant={statusVariant(announcement.status)}>
              {announcementStatusLabel(announcement.status)}
            </Badge>
          </div>

          <dl>
            <DetailRow label="Author" value={announcement.author.fullName} />
            <DetailRow label="Audience" value={announcement.audience} />
            <DetailRow
              label="Created"
              value={formatAnnouncementDateTime(announcement.createdAt)}
            />
            <DetailRow
              label="Updated"
              value={formatAnnouncementDateTime(announcement.updatedAt)}
            />
            <DetailRow
              label="Published"
              value={formatAnnouncementDateTime(announcement.publishedAt)}
            />
            <DetailRow
              label="Scheduled"
              value={formatAnnouncementDateTime(announcement.scheduledAt)}
            />
          </dl>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium">Body</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {announcement.body.trim() || "No body yet."}
            </p>
          </div>

          <AnnouncementAttachmentsView
            attachments={announcement.attachments ?? []}
          />
        </div>

        <SheetFooter className="mt-auto flex-wrap gap-3 sm:flex-row">
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onEdit(announcement)}
            >
              Edit
            </Button>
          ) : null}
          {canPublish ? (
            announcement.status !== "published" ? (
              <Button type="button" onClick={() => onPublish(announcement)}>
                Publish
              </Button>
            ) : (
              <Button type="button" disabled>
                Published
              </Button>
            )
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDelete(announcement)}
            >
              Delete
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
