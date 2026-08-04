"use client"

import { CertificatePreviewDocument } from "@/components/certificates/certificate-print-view"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MedicalCertificate } from "@/types/medicalCertificate"

export function CertificatePreviewDialog({
  certificate,
  open,
  onOpenChange,
  canPrint,
  onPrint,
}: {
  certificate: MedicalCertificate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canPrint?: boolean
  onPrint?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5">
          <DialogTitle>Certificate preview</DialogTitle>
          <DialogDescription>
            Visual preview of the medical certificate document.
          </DialogDescription>
        </DialogHeader>

        {certificate ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-200/80 px-4 py-6 dark:bg-neutral-900">
            <CertificatePreviewDocument certificate={certificate} />
          </div>
        ) : null}

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canPrint && certificate && onPrint ? (
            <Button onClick={onPrint}>Print</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
