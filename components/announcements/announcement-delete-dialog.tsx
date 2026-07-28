"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteAnnouncementAction } from "@/features/announcements/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Announcement } from "@/types/announcement"

export function AnnouncementDeleteDialog({
  announcement,
  open,
  onOpenChange,
  onDeleted,
}: {
  announcement: Announcement | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (id: string) => void
}) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!announcement) return

    startTransition(async () => {
      const result = await deleteAnnouncementAction(announcement.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success("Announcement deleted.")
      onOpenChange(false)
      onDeleted(announcement.id)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes{" "}
            <span className="font-medium text-foreground">
              {announcement?.title ?? "this announcement"}
            </span>
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || !announcement}
            onClick={(event) => {
              event.preventDefault()
              handleDelete()
            }}
          >
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
