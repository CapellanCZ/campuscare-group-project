"use client"

import { useState } from "react"

import { DocumentPreviewDialog } from "@/components/medical-documents/document-preview-dialog"
import { DocumentVoidDialog } from "@/components/medical-documents/document-void-dialog"
import { documentTypeLabel } from "@/components/medical-documents/document-print-view"
import {
  documentStatusLabel,
  documentStatusVariant,
} from "@/features/medical-documents/lib/document-status"
import { logMedicalDocumentViewAction } from "@/features/medical-documents/actions"
import {
  formatCertificateDate,
  formatCertificateDateTime,
} from "@/features/certificates/lib/format"
import type { MedicalDocument } from "@/types/medicalDocument"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function DocumentDetailSheet({
  document,
  open,
  onOpenChange,
  canPrint,
  canVoid,
  onVoided,
  onPrint,
}: {
  document: MedicalDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canPrint?: boolean
  canVoid?: boolean
  onVoided?: (document: MedicalDocument) => void
  onPrint?: (document: MedicalDocument) => void
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)

  if (!document) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{documentTypeLabel(document)}</SheetTitle>
            <SheetDescription>{document.documentNumber}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={documentStatusVariant(document.status)}>
                {documentStatusLabel(document.status)}
              </Badge>
              {document.status === "voided" ? (
                <span className="text-xs text-destructive">
                  {document.voidReason}
                </span>
              ) : null}
            </div>

            <dl className="space-y-2">
              <div>
                <dt className="text-muted-foreground">Patient</dt>
                <dd className="font-medium">{document.patient.fullName}</dd>
                <dd className="text-xs text-muted-foreground">
                  {document.patient.studentId ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Purpose</dt>
                <dd>{document.purpose ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Issued</dt>
                <dd>{formatCertificateDateTime(document.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Physician</dt>
                <dd>{document.doctorName ?? "—"}</dd>
              </div>
              {document.validUntil ? (
                <div>
                  <dt className="text-muted-foreground">Valid until</dt>
                  <dd>{formatCertificateDate(document.validUntil)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <SheetFooter className="flex-row flex-wrap gap-2 sm:justify-start">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewOpen(true)
                void logMedicalDocumentViewAction(document.id)
              }}
            >
              Preview
            </Button>
            {canPrint && document.status !== "voided" ? (
              <Button onClick={() => onPrint?.(document)}>Print</Button>
            ) : null}
            {canVoid && document.status !== "voided" ? (
              <Button variant="destructive" onClick={() => setVoidOpen(true)}>
                Void
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DocumentPreviewDialog
        document={document}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onPrint={() => {
          setPreviewOpen(false)
          onPrint?.(document)
        }}
      />

      <DocumentVoidDialog
        document={document}
        open={voidOpen}
        onOpenChange={setVoidOpen}
        onVoided={(next) => onVoided?.(next)}
      />
    </>
  )
}
