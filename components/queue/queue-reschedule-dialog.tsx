"use client"

import { useEffect, useState, useTransition } from "react"
import { appToast } from "@/lib/feedback/app-toast"
import { queueToasts } from "@/lib/feedback/toast-messages"

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
import { actionRescheduleQueueAppointment } from "@/lib/health/queue-server-actions"
import type { QueueTicketRow } from "@/lib/health/types"

export function QueueRescheduleDialog({
  ticket,
  open,
  onOpenChange,
  onRescheduled,
}: {
  ticket: QueueTicketRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRescheduled?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open) return
    setDate("")
    setTime("")
    setReason("")
  }, [open, ticket?.ticketId])

  if (!ticket) return null

  function handleSave() {
    if (!ticket?.appointmentId) {
      appToast.error({
        title: "Cannot reschedule",
        description: "This ticket is not linked to a scheduled appointment.",
      })
      return
    }
    if (!date || !time || !reason.trim()) {
      appToast.error({
        title: "Missing details",
        description: "Date, time, and reason are required.",
      })
      return
    }

    startTransition(async () => {
      const result = await actionRescheduleQueueAppointment({
        appointmentId: ticket.appointmentId!,
        preferredDate: date,
        preferredTime: time,
        reason: reason.trim(),
      })
      if (!result.ok) {
        queueToasts.failed(result.error)
        return
      }
      queueToasts.updated()
      onOpenChange(false)
      onRescheduled?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            Choose a new date and time for {ticket.patientName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="queue-reschedule-date">Date</FieldLabel>
            <Input
              id="queue-reschedule-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="queue-reschedule-time">Time</FieldLabel>
            <Input
              id="queue-reschedule-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="queue-reschedule-reason">Reason</FieldLabel>
            <Textarea
              id="queue-reschedule-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              disabled={pending}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={handleSave}>
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
