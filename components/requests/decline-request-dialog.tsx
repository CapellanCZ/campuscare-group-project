"use client"

import { useState, useTransition } from "react"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { appToast } from "@/lib/feedback/app-toast"
import { requestToasts } from "@/lib/feedback/toast-messages"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { declineConsultationRequestAction } from "@/features/requests/actions"
import { cn } from "@/lib/utils"
import { IconUser } from "@tabler/icons-react"

const MIN_DECLINE_WORDS = 8

function countWords(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

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
  const { confirmPreset } = useConfirm()
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const wordCount = countWords(reason)
  const meetsMinimum = wordCount >= MIN_DECLINE_WORDS

  function handleOpenChange(next: boolean) {
    if (!next) setReason("")
    onOpenChange(next)
  }

  function confirmDecline() {
    if (!requestId) return
    const trimmed = reason.trim()
    if (!meetsMinimum) {
      appToast.error({
        title: "Reason too short",
        description: `Write at least ${MIN_DECLINE_WORDS} words.`,
      })
      return
    }

    void confirmPreset("decline", {
      onConfirm: () => {
        startTransition(async () => {
          const result = await declineConsultationRequestAction({
            id: requestId,
            reason: trimmed,
          })
          if (!result.ok) {
            requestToasts.failed(result.error)
            return
          }
          requestToasts.declined()
          setReason("")
          onOpenChange(false)
          onDeclined?.()
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 gap-1.5 border-b border-border px-6 py-5 pr-12 text-left">
          <DialogTitle>Decline Consultation Request</DialogTitle>
          <DialogDescription>
            Tell the student why their consultation request was declined.
            They’ll see this message.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-5">
          {patientName ? (
            <div className="flex items-start gap-3 rounded-xl py-2">
              <span
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border/60"
                aria-hidden
              >
                <IconUser className="size-4" stroke={1.75} />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  Patient
                </p>
                <p className="mt-0.5 text-sm font-medium leading-snug text-foreground/75">
                  {patientName}
                </p>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Textarea
              id="decline-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Preferred slot is full this week. Please request another date or join the waitlist."
              rows={5}
              disabled={pending}
              aria-label="Decline reason"
              aria-required
              aria-describedby="decline-reason-hint"
              className="min-h-32 resize-none shadow-none"
            />
            <p
              id="decline-reason-hint"
              className={cn(
                "text-right text-xs tabular-nums",
                meetsMinimum
                  ? "font-medium text-foreground/70"
                  : "text-muted-foreground"
              )}
            >
              {wordCount} / {MIN_DECLINE_WORDS} words
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/10 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="border-border/70"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !meetsMinimum}
            onClick={confirmDecline}
          >
            {pending ? "Declining…" : "Confirm decline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
