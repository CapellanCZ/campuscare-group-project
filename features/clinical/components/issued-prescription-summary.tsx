"use client"

import { useEffect } from "react"

import { formatMedicationsAsPrescriptionText } from "@/features/medical-documents/lib/map-consultation-context"
import type { MedicalDocument, PrescriptionPayload } from "@/types/medicalDocument"

export function issuedPrescriptionTextFromDocuments(
  documents: MedicalDocument[]
): string {
  const issued = documents.find((doc) => {
    if (doc.documentType !== "prescription") return false
    return doc.status === "issued" || doc.status === "printed"
  })
  if (!issued) return ""
  const payload = issued.payload as PrescriptionPayload
  return formatMedicationsAsPrescriptionText(payload.medications)
}

export function IssuedPrescriptionSummary({
  documents,
  loading,
  onTextChange,
}: {
  documents: MedicalDocument[]
  loading?: boolean
  onTextChange?: (text: string) => void
}) {
  const issued = documents.find((doc) => {
    if (doc.documentType !== "prescription") return false
    return doc.status === "issued" || doc.status === "printed"
  })
  const payload = issued?.payload as PrescriptionPayload | undefined
  const medications = payload?.medications?.filter((med) => med.name?.trim()) ?? []
  const text = issuedPrescriptionTextFromDocuments(documents)

  useEffect(() => {
    onTextChange?.(text)
  }, [onTextChange, text])

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading prescription…</p>
    )
  }

  if (!issued || medications.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-sm text-muted-foreground">
        No prescription issued yet. Use Issue Medical Document below to add
        medications from the Prescription Form.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        From issued document {issued.documentNumber}
      </p>
      <ul className="space-y-2 text-sm">
        {medications.map((med, index) => (
          <li key={`${med.name}-${index}`} className="border-b border-border/60 pb-2 last:border-0">
            <p className="font-medium">{med.name}</p>
            <p className="text-muted-foreground">
              {[
                med.strength,
                med.quantity ? `Qty: ${med.quantity}` : null,
                med.frequency,
                med.duration,
                med.instructions,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
