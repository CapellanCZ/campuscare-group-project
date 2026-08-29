"use client"

import { IconFileText, IconPrinter } from "@tabler/icons-react"

import { MedicalDocumentPreviewBody } from "@/components/medical-documents/document-print-view"
import { documentTypeLabel } from "@/components/medical-documents/document-print-view"
import { formatCertificateDateTime } from "@/features/certificates/lib/format"
import {
  documentStatusLabel,
  documentStatusVariant,
} from "@/features/medical-documents/lib/document-status"
import type { MedicalDocument } from "@/types/medicalDocument"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

function PreviewMetaItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
  onPrint,
}: {
  document: MedicalDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint?: () => void
}) {
  const typeLabel = document ? documentTypeLabel(document) : "Document"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,920px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-3 border-b bg-muted/20 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
              <IconFileText className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="text-lg">{typeLabel}</DialogTitle>
              <DialogDescription>
                Official HSO document preview. Review the layout before printing.
              </DialogDescription>
            </div>
            {document ? (
              <Badge variant={documentStatusVariant(document.status)}>
                {documentStatusLabel(document.status)}
              </Badge>
            ) : null}
          </div>

          {document ? (
            <>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PreviewMetaItem
                  label="Document no."
                  value={document.documentNumber}
                />
                <PreviewMetaItem
                  label="Issued"
                  value={formatCertificateDateTime(document.issuedAt)}
                />
                <PreviewMetaItem
                  label="Patient"
                  value={document.patient.fullName}
                />
                <PreviewMetaItem
                  label="Physician"
                  value={document.doctorName ?? "—"}
                />
              </div>
              {document.purpose ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Purpose:</span>{" "}
                  {document.purpose}
                </p>
              ) : null}
            </>
          ) : null}
        </DialogHeader>

        {document ? (
          <div className="min-h-0 flex-1 overflow-auto bg-neutral-100/90 px-4 py-6 dark:bg-neutral-950/40">
            <MedicalDocumentPreviewBody document={document} />
          </div>
        ) : null}

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {document && onPrint ? (
            <Button onClick={onPrint}>
              <IconPrinter className="size-4" />
              Print document
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
