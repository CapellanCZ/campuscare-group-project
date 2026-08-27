"use client"

import { MedicalDocumentPreviewBody } from "@/components/medical-documents/document-print-view"
import type { MedicalDocument } from "@/types/medicalDocument"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5">
          <DialogTitle>Document preview</DialogTitle>
          <DialogDescription>
            Official HSO template preview for {document?.documentNumber ?? "document"}.
          </DialogDescription>
        </DialogHeader>

        {document ? (
          <div className="min-h-0 flex-1 overflow-auto bg-neutral-200/80 px-4 py-6 dark:bg-neutral-900">
            <MedicalDocumentPreviewBody document={document} />
          </div>
        ) : null}

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {document && onPrint ? (
            <Button onClick={onPrint}>Print</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
