"use client"

import { useEffect, useRef } from "react"

import { useConfirm } from "@/components/feedback/confirm-provider"
import { deletePatientRecordAction } from "@/features/patients/actions"
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
  const { confirmPreset } = useConfirm()
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (!open || !patient || inFlightRef.current) return
    inFlightRef.current = true
    onOpenChange(false)

    const idLabel =
      patient.patientType === "faculty"
        ? patient.employeeId
        : patient.studentId

    void confirmPreset("delete", {
      description: `This permanently deletes ${patientFullName(patient)}${
        idLabel ? ` (${idLabel})` : ""
      } and all linked consultations. This action may not be reversible.`,
      onConfirm: async () => {
        const result = await deletePatientRecordAction(patient.id)
        if (!result.ok) throw new Error(result.error)
        onDeleted(patient.id)
      },
      successToast: {
        title: "Patient Record Deleted",
        description: "The patient record has been removed successfully.",
      },
      errorToast: {
        title: "Unable to Delete Patient Record",
      },
    }).finally(() => {
      inFlightRef.current = false
    })
  }, [confirmPreset, onDeleted, onOpenChange, open, patient])

  return null
}
