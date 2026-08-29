"use client"

import { useEffect, useRef } from "react"

import { useConfirm } from "@/components/feedback/confirm-provider"
import { deleteMedicalCertificateAction } from "@/features/certificates/actions"
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
  const { confirmPreset } = useConfirm()
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (!open || !certificate || inFlightRef.current) return
    inFlightRef.current = true
    onOpenChange(false)

    void confirmPreset("delete", {
      description: `This permanently deletes ${certificate.certificateNumber}${
        certificate.patient.fullName
          ? ` for ${certificate.patient.fullName}`
          : ""
      }. This action may not be reversible.`,
      onConfirm: async () => {
        const result = await deleteMedicalCertificateAction(certificate.id)
        if (!result.ok) throw new Error(result.error)
        onDeleted(certificate.id)
      },
      successToast: {
        title: "Certificate Deleted",
        description: "The medical certificate has been removed successfully.",
      },
      errorToast: {
        title: "Unable to Delete Certificate",
      },
    }).finally(() => {
      inFlightRef.current = false
    })
  }, [certificate, confirmPreset, onDeleted, onOpenChange, open])

  return null
}
