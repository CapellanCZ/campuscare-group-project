"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { voidMedicalDocumentAction } from "@/features/medical-documents/actions"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function DocumentVoidDialog({
  document,
  open,
  onOpenChange,
  onVoided,
}: {
  document: MedicalDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onVoided: (document: MedicalDocument) => void
}) {
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleVoid() {
    if (!document) return
    startTransition(async () => {
      const result = await voidMedicalDocumentAction({
        id: document.id,
        reason,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Document voided.")
      setReason("")
      onVoided(result.data)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Void document</DialogTitle>
          <DialogDescription>
            Voiding preserves the record for audit. {document?.documentNumber}{" "}
            will be marked void and cannot be reprinted as valid.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="void-reason">Reason</Label>
          <Textarea
            id="void-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this document is being voided"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || isPending}
            onClick={handleVoid}
          >
            Void document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
