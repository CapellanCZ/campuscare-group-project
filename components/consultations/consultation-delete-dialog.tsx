"use client"

import { useEffect, useRef } from "react"

import { useConfirm } from "@/components/feedback/confirm-provider"
import { deleteConsultationAction } from "@/features/consultations/actions"
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
  const { confirmPreset } = useConfirm()
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (!open || !consultation || inFlightRef.current) return
    inFlightRef.current = true
    onOpenChange(false)

    void confirmPreset("delete", {
      description: `This permanently deletes the consultation for ${consultation.patient.fullName}${
        consultation.chiefComplaint ? ` (${consultation.chiefComplaint})` : ""
      }. This action may not be reversible.`,
      onConfirm: async () => {
        const result = await deleteConsultationAction(consultation.id)
        if (!result.ok) throw new Error(result.error)
        onDeleted(consultation.id)
      },
      successToast: {
        title: "Consultation Deleted",
        description: "The consultation record has been removed successfully.",
      },
      errorToast: {
        title: "Unable to Delete Consultation",
      },
    }).finally(() => {
      inFlightRef.current = false
    })
  }, [confirmPreset, consultation, onDeleted, onOpenChange, open])

  return null
}
