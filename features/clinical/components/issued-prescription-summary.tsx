"use client"

import { useEffect } from "react"

import {
  formatMedicationDetailParts,
  formatMedicationsAsPrescriptionText,
} from "@/features/medical-documents/lib/map-consultation-context"
import { formatDiagnosticRequestLines } from "@/lib/medical-documents/diagnostic-request-options"
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
  const meds = formatMedicationsAsPrescriptionText(payload.medications)
  const diagnosticLines = payload.diagnosticRequests
    ? formatDiagnosticRequestLines(payload.diagnosticRequests)
    : []
  if (diagnosticLines.length === 0) return meds
  const diagnosticBlock =
    diagnosticLines.length === 1
      ? `Request for ${diagnosticLines[0]}`
      : `Request for:\n${diagnosticLines.map((line) => `- ${line}`).join("\n")}`
  return [meds, diagnosticBlock].filter(Boolean).join("\n\n")
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
  const diagnosticLines = payload?.diagnosticRequests
    ? formatDiagnosticRequestLines(payload.diagnosticRequests)
    : []
  const text = issuedPrescriptionTextFromDocuments(documents)

  useEffect(() => {
    onTextChange?.(text)
  }, [onTextChange, text])

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading prescription…</p>
    )
  }

  if (!issued || (medications.length === 0 && diagnosticLines.length === 0)) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-sm text-muted-foreground">
        No prescription issued yet. Use Issue Medical Document below to add
        medications and/or laboratory requests from the Prescription Form.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        From issued document {issued.documentNumber}
      </p>
      {medications.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {medications.map((med, index) => (
            <li
              key={`${med.name}-${index}`}
              className="border-b border-border/60 pb-2 last:border-0"
            >
              <p className="font-medium">{med.name}</p>
              <div className="space-y-0.5 text-muted-foreground">
                {formatMedicationDetailParts(med).map((part) => (
                  <p key={part}>{part}</p>
                ))}
                {med.instructions?.trim() ? (
                  <p className="italic">{med.instructions.trim()}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {diagnosticLines.length > 0 ? (
        <div className="space-y-1 text-sm">
          {diagnosticLines.length === 1 ? (
            <p className="font-medium">Request for {diagnosticLines[0]}</p>
          ) : (
            <>
              <p className="font-medium">Request for:</p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {diagnosticLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
