"use client"

import { useEffect, useRef } from "react"

import { useConfirm } from "@/components/feedback/confirm-provider"
import { deleteAnnouncementAction } from "@/features/announcements/actions"
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
  const { confirmPreset } = useConfirm()
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (!open || !announcement || inFlightRef.current) return
    inFlightRef.current = true
    onOpenChange(false)

    void confirmPreset("delete", {
      description: `This permanently deletes "${
        announcement.title ?? "this announcement"
      }". This action may not be reversible.`,
      onConfirm: async () => {
        const result = await deleteAnnouncementAction(announcement.id)
        if (!result.ok) throw new Error(result.error)
        onDeleted(announcement.id)
      },
      successToast: {
        title: "Announcement Deleted",
        description: "The announcement has been removed successfully.",
      },
      errorToast: {
        title: "Unable to Delete Announcement",
      },
    }).finally(() => {
      inFlightRef.current = false
    })
  }, [announcement, confirmPreset, onDeleted, onOpenChange, open])

  return null
}
