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
import {
  formatRequestPreferred,
} from "@/features/requests/lib/format"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { consultationProviderLabel } from "@/lib/health/consultation-workflow"
import type { AppointmentRequest } from "@/types/appointmentRequest"
import { cn } from "@/lib/utils"

const slotInputClassName = cn(
  "h-10 rounded-xl border-input bg-input/30 shadow-none",
  "[&::-webkit-calendar-picker-indicator]:opacity-60",
  "[&::-webkit-calendar-picker-indicator]:hover:opacity-100"
)

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
  const [baseline, setBaseline] = useState({ date: "", time: "" })

  useEffect(() => {
    if (!open || !request) return
    const nextDate = request.preferredDate ?? ""
    const nextTime = (request.preferredTime ?? "").slice(0, 5)
    setRescheduleDate(nextDate)
    setRescheduleTime(nextTime)
    setRescheduleReason("")
    setBaseline({ date: nextDate, time: nextTime })
    setPending(false)
  }, [open, request])

  if (!request) return null

  const currentPreferred = formatRequestPreferred(
    request.preferredDate,
    request.preferredTime
  )
  const serviceLabel = displayConsultationLabel(
    request.service,
    request.reason
  )
  const preferredTime = rescheduleTime.trim().slice(0, 5)
  const slotChanged =
    rescheduleDate.trim() !== baseline.date ||
    preferredTime !== baseline.time
  const hasReason = Boolean(rescheduleReason.trim())
  const canSave =
    slotChanged &&
    hasReason &&
    Boolean(rescheduleDate.trim()) &&
    /^\d{2}:\d{2}$/.test(preferredTime)

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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="gap-1.5 border-b border-border px-6 py-5 pr-12 text-left">
          <DialogTitle>Reschedule consultation request</DialogTitle>
          <DialogDescription>
            Propose a new preferred slot. A reason is required and stays on the
            request record.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-5">
          <div className="space-y-1.5 text-sm">
            <p>
              <span className="text-muted-foreground">Patient:</span>{" "}
              <span className="font-medium text-foreground">
                {request.patientName}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Specialty:</span>{" "}
              {consultationProviderLabel(request.providerType)}
            </p>
            {serviceLabel !== "—" ? (
              <p>
                <span className="text-muted-foreground">Service:</span>{" "}
                {serviceLabel}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Current preferred:</span>{" "}
              {currentPreferred}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
            <Field className="gap-2">
              <FieldLabel htmlFor="reschedule-date">New date</FieldLabel>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
                disabled={pending}
                className={slotInputClassName}
              />
            </Field>
            <Field className="gap-2">
              <FieldLabel htmlFor="reschedule-time">New time</FieldLabel>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)}
                disabled={pending}
                className={slotInputClassName}
              />
            </Field>
          </div>

          <Field className="gap-2">
            <FieldLabel htmlFor="reschedule-reason">
              Reschedule reason
            </FieldLabel>
            <Textarea
              id="reschedule-reason"
              value={rescheduleReason}
              onChange={(event) => setRescheduleReason(event.target.value)}
              rows={4}
              disabled={pending}
              aria-required
              placeholder="Explain why this request is being rescheduled"
              className="min-h-24 resize-none shadow-none"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-muted/10 px-6 py-4 sm:justify-end">
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
            {pending ? "Saving…" : "Save reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
