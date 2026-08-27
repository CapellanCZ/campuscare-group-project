"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { DocumentPreviewDialog } from "@/components/medical-documents/document-preview-dialog"
import {
  certificateToDocument,
  documentTypeLabel,
} from "@/components/medical-documents/document-print-view"
import { fetchPatientDocumentsAction } from "@/features/patients/actions"
import { documentStatusLabel } from "@/features/medical-documents/lib/document-status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { MedicalCertificate } from "@/types/medicalCertificate"
import type { MedicalDocument } from "@/types/medicalDocument"
import { patientFullName, type PatientRecord } from "@/types/patientRecord"

function formatDate(value: string | null) {
  if (!value) return "—"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed))
}

export function PatientDocumentsSheet({
  patient,
  open,
  onOpenChange,
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [rows, setRows] = useState<MedicalCertificate[]>([])
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<MedicalDocument | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (!open || !patient) return
    let cancelled = false
    setLoading(true)
    void fetchPatientDocumentsAction({
      studentId: patient.studentId,
      employeeId: patient.employeeId,
    }).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        toast.error(result.error)
        setRows([])
        return
      }
      setRows(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [open, patient])

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) {
            setPreviewOpen(false)
            setPreview(null)
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>Medical documents</DialogTitle>
            <DialogDescription>
              {patient
                ? `Certificates on file for ${patientFullName(patient)}. Select one to preview.`
                : "Patient certificates"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 pb-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))
            ) : rows.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                No medical documents found for this patient yet.
              </p>
            ) : (
              rows.map((row) => (
                <Button
                  key={row.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left whitespace-normal"
                  onClick={() => {
                    setPreview(certificateToDocument(row))
                    setPreviewOpen(true)
                  }}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {documentTypeLabel(certificateToDocument(row))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.certificateNumber}
                      {row.doctorName ? ` · ${row.doctorName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issued {formatDate(row.issuedAt)}
                      {row.validUntil
                        ? ` · Valid until ${formatDate(row.validUntil)}`
                        : ""}
                    </p>
                    {row.purpose ? (
                      <p className="text-xs text-muted-foreground">
                        Purpose: {row.purpose}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {documentStatusLabel(row.status)}
                  </Badge>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        document={preview}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  )
}
