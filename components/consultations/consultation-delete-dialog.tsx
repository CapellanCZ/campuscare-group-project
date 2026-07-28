"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteConsultationAction } from "@/features/consultations/actions"
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
import type { Consultation } from "@/types/consultation"

export function ConsultationDeleteDialog({
  consultation,
  open,
  onOpenChange,
  onDeleted,
}: {
  consultation: Consultation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (id: string) => void
}) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!consultation) return
    startTransition(async () => {
      const result = await deleteConsultationAction(consultation.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Consultation deleted.")
      onOpenChange(false)
      onDeleted(consultation.id)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete consultation?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the consultation for{" "}
            <span className="font-medium text-foreground">
              {consultation?.patient.fullName ?? "this patient"}
            </span>
            {consultation?.chiefComplaint
              ? ` (${consultation.chiefComplaint})`
              : ""}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || !consultation}
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
