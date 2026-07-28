"use client"

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
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value}</dd>
    </div>
  )
}

export function AnnouncementDetailSheet({
  announcement,
  open,
  onOpenChange,
  canEdit,
  canDelete,
  canPublish,
  onEdit,
  onDelete,
  onPublish,
}: {
  announcement: Announcement | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit: boolean
  canDelete: boolean
  canPublish: boolean
  onEdit: () => void
  onDelete: () => void
  onPublish: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{announcement?.title ?? "Announcement"}</SheetTitle>
          <SheetDescription>
            {announcement?.audience ?? "Clinic notice"}
          </SheetDescription>
        </SheetHeader>

        {announcement ? (
          <dl className="px-4 py-2">
            <DetailRow
              label="Status"
              value={
                <Badge variant={statusVariant(announcement.status)}>
                  {announcementStatusLabel(announcement.status)}
                </Badge>
              }
            />
            <DetailRow label="Audience" value={announcement.audience} />
            <DetailRow label="Author" value={announcement.author.fullName} />
            <DetailRow
              label="Published"
              value={formatAnnouncementDateTime(announcement.publishedAt)}
            />
            <DetailRow
              label="Scheduled"
              value={formatAnnouncementDateTime(announcement.scheduledAt)}
            />
            <DetailRow
              label="Updated"
              value={formatAnnouncementDateTime(announcement.updatedAt)}
            />
            <DetailRow
              label="Message"
              value={
                announcement.body.trim() ? (
                  <p className="whitespace-pre-wrap font-normal text-foreground">
                    {announcement.body}
                  </p>
                ) : (
                  "No message body."
                )
              }
            />
          </dl>
        ) : null}

        <SheetFooter className="border-t">
          {canPublish && announcement?.status !== "published" ? (
            <Button onClick={onPublish}>Publish now</Button>
          ) : null}
          {canEdit ? (
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
