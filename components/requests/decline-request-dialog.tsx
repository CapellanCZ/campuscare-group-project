"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { declineConsultationRequestAction } from "@/features/requests/actions"

export function DeclineRequestDialog({
  open,
  onOpenChange,
  requestId,
  patientName,
  onDeclined,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string | null
  patientName?: string | null
  onDeclined?: () => void
}) {
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (!next) setReason("")
    onOpenChange(next)
  }

  function confirmDecline() {
    if (!requestId) return
    const trimmed = reason.trim()
    if (!trimmed) {
      toast.error("A decline reason is required.")
      return
    }

    startTransition(async () => {
      const result = await declineConsultationRequestAction({
        id: requestId,
        reason: trimmed,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Request declined.")
      setReason("")
      onOpenChange(false)
      onDeclined?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline consultation request</DialogTitle>
          <DialogDescription>
            {patientName
              ? `Provide a reason so ${patientName} understands why this request was declined.`
              : "Provide a reason so the student understands why this request was declined."}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="decline-reason">Decline Reason</FieldLabel>
          <Textarea
            id="decline-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this request is being declined"
            rows={4}
            disabled={pending}
            aria-required
          />
        </Field>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !reason.trim()}
            onClick={confirmDecline}
          >
            Confirm Decline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
