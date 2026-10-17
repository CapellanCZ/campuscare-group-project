"use client"

import { useEffect, useRef, useState } from "react"

import { DocumentPreviewDialog } from "@/components/medical-documents/document-preview-dialog"
import { documentTypeLabel } from "@/components/medical-documents/document-print-view"
import { fetchMedicalDocumentByIdAction } from "@/features/medical-documents/actions"
import { fetchPatientDocumentsAction } from "@/features/patients/actions"
import {
  documentStatusLabel,
  documentStatusToneKey,
} from "@/features/medical-documents/lib/document-status"
import type { ClinicalRecordScope } from "@/lib/clinical/record-scope"
import { appToast } from "@/lib/feedback/app-toast"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  STATUS_BADGE_DOT,
  STATUS_BADGE_TONE,
} from "@/lib/ui/status-badge-tone"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
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
  documentScope = "all",
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  documentScope?: ClinicalRecordScope
}) {
  const [rows, setRows] = useState<MedicalDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<MedicalDocument | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const cacheRef = useRef(new Map<string, MedicalDocument[]>())

  useEffect(() => {
    if (!open || !patient) return
    let cancelled = false
    // v2: MedicalDocument with resolved documentType (not legacy certificate-only).
    const key = [
      "v2",
      patient.studentId ?? "",
      patient.employeeId ?? "",
      patient.id,
      documentScope,
    ].join("|")
    const cached = cacheRef.current.get(key)
    if (cached) {
      setRows(cached)
      setLoading(false)
    } else {
      setRows([])
      setLoading(true)
    }
    void fetchPatientDocumentsAction(
      {
        studentId: patient.studentId,
        employeeId: patient.employeeId,
      },
      documentScope
    ).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        appToast.error({
          title: "Unable to Load Documents",
          description: result.error,
        })
        setRows([])
        return
      }
      cacheRef.current.set(key, result.data)
      setRows(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [documentScope, open, patient])

  const showSkeleton = loading && rows.length === 0

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
                ? `Documents on file for ${patientFullName(patient)}. Select one to preview.`
                : "Patient documents"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 pb-6">
            {showSkeleton ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
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
                    setPreview(row)
                    setPreviewOpen(true)
                    void fetchMedicalDocumentByIdAction(row.id).then(
                      (result) => {
                        if (!result.ok) {
                          appToast.error({
                            title: "Unable to load document",
                            description: result.error,
                          })
                          return
                        }
                        setPreview(result.data)
                      }
                    )
                  }}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {documentTypeLabel(row)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.documentNumber}
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
                  <StatusBadge
                    className="shrink-0"
                    label={documentStatusLabel(row.status)}
                    toneClassName={
                      STATUS_BADGE_TONE[documentStatusToneKey(row.status)]
                    }
                    dotClassName={
                      STATUS_BADGE_DOT[documentStatusToneKey(row.status)]
                    }
                  />
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
