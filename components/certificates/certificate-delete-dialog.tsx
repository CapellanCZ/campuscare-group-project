"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteMedicalCertificateAction } from "@/features/certificates/actions"
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
import type { MedicalCertificate } from "@/types/medicalCertificate"

export function CertificateDeleteDialog({
  certificate,
  open,
  onOpenChange,
  onDeleted,
}: {
  certificate: MedicalCertificate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (id: string) => void
}) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!certificate) return

    startTransition(async () => {
      const result = await deleteMedicalCertificateAction(certificate.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success("Medical certificate deleted.")
      onOpenChange(false)
      onDeleted(certificate.id)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default" className="print:hidden">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete medical certificate?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes{" "}
            <span className="font-medium text-foreground">
              {certificate?.certificateNumber ?? "this certificate"}
            </span>
            {certificate?.patient.fullName
              ? ` for ${certificate.patient.fullName}`
              : ""}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || !certificate}
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
