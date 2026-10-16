"use client"

import { useEffect, useState } from "react"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { rescheduleConsultationRequestAction } from "@/features/requests/actions"
import type { AppointmentRequest } from "@/types/appointmentRequest"

export function RescheduleRequestDialog({
  open,
  onOpenChange,
  request,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: AppointmentRequest | null
  onUpdated: (request: AppointmentRequest) => void
}) {
  const { confirmPreset } = useConfirm()
  const [pending, setPending] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleTime, setRescheduleTime] = useState("")
  const [rescheduleReason, setRescheduleReason] = useState("")

  useEffect(() => {
    if (!open || !request) return
    setRescheduleDate(request.preferredDate ?? "")
    setRescheduleTime((request.preferredTime ?? "").slice(0, 5))
    setRescheduleReason("")
    setPending(false)
  }, [open, request])

  if (!request) return null

  function handleSave() {
    const trimmed = rescheduleReason.trim()
    const preferredDate = rescheduleDate.trim()
    // HTML time inputs may include seconds; API expects Manila HH:mm.
    const preferredTime = rescheduleTime.trim().slice(0, 5)
    if (!trimmed) {
      appToast.error({
        title: "Reschedule reason required",
        description: "A reschedule reason is required.",
      })
      return
    }
    if (!preferredDate || !/^\d{2}:\d{2}$/.test(preferredTime)) {
      appToast.error({
        title: "Date and time required",
        description: "New date and time are required.",
      })
      return
    }

    // Await the mutation inside onConfirm (do not wrap in startTransition) so
    // nested AlertDialog confirm finishes before closing — otherwise the save
    // can be abandoned when dialogs unmount.
    setPending(true)
    void confirmPreset("reschedule", {
      pendingLabel: "Saving…",
      onConfirm: async () => {
        const result = await rescheduleConsultationRequestAction({
          id: request!.id,
          preferredDate,
          preferredTime,
          reason: trimmed,
        })
        if (!result.ok) {
          throw new Error(result.error)
        }
        requestToasts.rescheduled()
        onUpdated(result.data)
        onOpenChange(false)
      },
    }).finally(() => setPending(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule consultation request</DialogTitle>
          <DialogDescription>
            Propose a new date and time for {request.patientName}. A reason is
            required and will be saved with the request.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="reschedule-date">New date</FieldLabel>
            <Input
              id="reschedule-date"
              type="date"
              value={rescheduleDate}
              onChange={(event) => setRescheduleDate(event.target.value)}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="reschedule-time">New time</FieldLabel>
            <Input
              id="reschedule-time"
              type="time"
              value={rescheduleTime}
              onChange={(event) => setRescheduleTime(event.target.value)}
              disabled={pending}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="reschedule-reason">Reschedule reason</FieldLabel>
          <Textarea
            id="reschedule-reason"
            value={rescheduleReason}
            onChange={(event) => setRescheduleReason(event.target.value)}
            rows={3}
            disabled={pending}
            aria-required
            placeholder="Explain why this request is being rescheduled"
          />
        </Field>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              pending ||
              !rescheduleDate ||
              !rescheduleTime ||
              !rescheduleReason.trim()
            }
            onClick={handleSave}
          >
            Save reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
