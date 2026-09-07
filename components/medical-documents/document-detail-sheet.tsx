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
import { CAMPUS_ID_LABEL } from "@/types/patientRecord"
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

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-3.5 last:border-b-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-relaxed font-medium break-words">
        {value}
      </dd>
    </div>
  )
}

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

  const typeLabel = documentTypeLabel(document)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg print:hidden">
          <SheetHeader className="border-b border-border/70">
            <SheetTitle>{typeLabel}</SheetTitle>
            <SheetDescription>
              {document.documentNumber} · Document details
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-1">
            <dl>
              <DetailRow
                label="Status"
                value={
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={documentStatusVariant(document.status)}>
                      {documentStatusLabel(document.status)}
                    </Badge>
                    {document.status === "voided" && document.voidReason ? (
                      <span className="text-xs font-normal text-destructive">
                        {document.voidReason}
                      </span>
                    ) : null}
                  </div>
                }
              />
              <DetailRow label="Patient" value={document.patient.fullName} />
              <DetailRow
                label={CAMPUS_ID_LABEL}
                value={document.patient.studentId ?? "—"}
              />
              <DetailRow
                label="Document number"
                value={document.documentNumber}
              />
              <DetailRow label="Document type" value={typeLabel} />
              <DetailRow label="Purpose" value={document.purpose ?? "—"} />
              <DetailRow
                label="Physician"
                value={document.doctorName ?? "—"}
              />
              <DetailRow
                label="Issued"
                value={formatCertificateDateTime(document.issuedAt)}
              />
              {document.validUntil ? (
                <DetailRow
                  label="Valid until"
                  value={formatCertificateDate(document.validUntil)}
                />
              ) : null}
              <DetailRow
                label="Created"
                value={formatCertificateDateTime(document.createdAt)}
              />
              <DetailRow
                label="Updated"
                value={formatCertificateDateTime(document.updatedAt)}
              />
            </dl>
          </div>

          <SheetFooter className="gap-2 border-t border-border/70 sm:flex-row sm:flex-wrap sm:justify-start">
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
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
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
