"use client"

import { useEffect, useState, useTransition } from "react"
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
  const [pending, startTransition] = useTransition()
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleTime, setRescheduleTime] = useState("")
  const [rescheduleReason, setRescheduleReason] = useState("")

  useEffect(() => {
    if (!open || !request) return
    setRescheduleDate(request.preferredDate ?? "")
    setRescheduleTime(request.preferredTime ?? "")
    setRescheduleReason("")
  }, [open, request])

  if (!request) return null

  function handleSave() {
    const trimmed = rescheduleReason.trim()
    if (!trimmed) {
      toast.error("A reschedule reason is required.")
      return
    }
    if (!rescheduleDate || !rescheduleTime) {
      toast.error("New date and time are required.")
      return
    }

    startTransition(async () => {
      const result = await rescheduleConsultationRequestAction({
        id: request!.id,
        preferredDate: rescheduleDate,
        preferredTime: rescheduleTime,
        reason: trimmed,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Request rescheduled.")
      onUpdated(result.data)
      onOpenChange(false)
    })
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
