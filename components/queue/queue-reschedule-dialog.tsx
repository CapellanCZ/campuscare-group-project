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
import { ticketLabel } from "@/lib/health/mappers"
import { actionRescheduleQueueAppointment } from "@/lib/health/queue-server-actions"
import type { QueueTicketRow } from "@/lib/health/types"
import { cn } from "@/lib/utils"

const slotInputClassName = cn(
  "h-10 rounded-xl border-input bg-input/30 shadow-none",
  "[&::-webkit-calendar-picker-indicator]:opacity-60",
  "[&::-webkit-calendar-picker-indicator]:hover:opacity-100"
)

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

  const ticketNo = ticketLabel(ticket.queueNumber, ticket.ticketCode)
  const canSave = Boolean(date && time && reason.trim())

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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 gap-1.5 border-b border-border px-5 py-4 pr-14 text-left sm:px-6 sm:py-5 sm:pr-16">
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription className="max-w-[calc(100%-2.5rem)]">
            Choose a new date and time. A reason is required for the record.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <p className="truncate text-sm font-medium text-foreground">
              {ticket.patientName}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {ticketNo}
              {ticket.consultationType
                ? ` · ${ticket.consultationType}`
                : ""}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="queue-reschedule-date">Date</FieldLabel>
              <Input
                id="queue-reschedule-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={pending}
                required
                className={slotInputClassName}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="queue-reschedule-time">Time</FieldLabel>
              <Input
                id="queue-reschedule-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                disabled={pending}
                required
                className={slotInputClassName}
              />
            </Field>
          </div>

          <Field className="gap-1.5">
            <FieldLabel htmlFor="queue-reschedule-reason">Reason</FieldLabel>
            <Textarea
              id="queue-reschedule-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              disabled={pending}
              required
              aria-required
              placeholder="Why is this appointment being moved?"
              className="min-h-24 resize-none rounded-xl shadow-none"
            />
          </Field>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/10 px-5 py-4 sm:px-6 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="border-border/70"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !canSave}
            onClick={handleSave}
          >
            {pending ? "Saving…" : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
