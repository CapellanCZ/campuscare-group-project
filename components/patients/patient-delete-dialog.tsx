"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deletePatientRecordAction } from "@/features/patients/actions"
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
import {
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"

export function PatientDeleteDialog({
  patient,
  open,
  onOpenChange,
  onDeleted,
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (id: string) => void
}) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!patient) return
    startTransition(async () => {
      const result = await deletePatientRecordAction(patient.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Patient record deleted.")
      onOpenChange(false)
      onDeleted(patient.id)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete patient record?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes{" "}
            <span className="font-medium text-foreground">
              {patient ? patientFullName(patient) : "this patient"}
            </span>
            {patient?.studentId ? ` (${patient.studentId})` : ""} and all linked
            consultations. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || !patient}
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
