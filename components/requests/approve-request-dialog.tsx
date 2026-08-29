"use client"

import { useEffect, useState, useTransition } from "react"
import { useConfirm } from "@/components/feedback/confirm-provider"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  admitConsultationRequestAction,
  approveConsultationRequestAction,
  listAssignableDoctorsAction,
} from "@/features/requests/actions"
import {
  formatRequestDate,
} from "@/features/requests/lib/format"
import type { AppointmentRequest } from "@/types/appointmentRequest"

export function ApproveRequestDialog({
  open,
  onOpenChange,
  request,
  mode = "approve",
  onUpdated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: AppointmentRequest | null
  mode?: "approve" | "admit"
  onUpdated: (request: AppointmentRequest) => void
}) {
  const { confirmPreset } = useConfirm()
  const [pending, startTransition] = useTransition()
  const [doctors, setDoctors] = useState<
    { id: string; fullName: string; email: string | null }[]
  >([])
  const [doctorId, setDoctorId] = useState("")
  const [scheduleAt, setScheduleAt] = useState("")
  const [room, setRoom] = useState("")
  const [approvalNotes, setApprovalNotes] = useState("")

  useEffect(() => {
    if (!open || !request) return
    setDoctorId(request.doctorId ?? "")
    setScheduleAt(request.startsAt ? request.startsAt.slice(0, 16) : "")
    setRoom(request.location ?? "")
    setApprovalNotes("")
    void listAssignableDoctorsAction().then((result) => {
      if (result.ok) setDoctors(result.data)
    })
  }, [open, request])

  if (!request) return null

  const isAdmit = mode === "admit" || request.status === "waitlisted"

  function executeConfirm() {
    startTransition(async () => {
      if (isAdmit) {
        const result = await admitConsultationRequestAction(request!.id, true)
        if (!result.ok) {
          requestToasts.failed(result.error)
          return
        }
        requestToasts.approved()
        onUpdated(result.data)
        onOpenChange(false)
        return
      }

      const doctor = doctors.find((item) => item.id === doctorId)
      const result = await approveConsultationRequestAction({
        id: request!.id,
        doctorId: doctorId || null,
        doctorName: doctor?.fullName ?? null,
        scheduleAt: scheduleAt ? new Date(scheduleAt).toISOString() : null,
        location: room,
        notes: approvalNotes,
      })
      if (!result.ok) {
        requestToasts.failed(result.error)
        return
      }
      requestToasts.approved()
      onUpdated(result.data)
      onOpenChange(false)
    })
  }

  function handleConfirm() {
    if (isAdmit) {
      void confirmPreset("approve", {
        title: "Admit from waitlist?",
        description: `Admit ${request!.patientName} to the queue for their preferred date?`,
        confirmLabel: "Admit to queue",
        onConfirm: executeConfirm,
      })
      return
    }

    void confirmPreset("approve", {
      onConfirm: executeConfirm,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAdmit ? "Admit from waitlist" : "Approve consultation request"}
          </DialogTitle>
          <DialogDescription>
            {isAdmit
              ? `Admit ${request.patientName} to the queue for their preferred date.`
              : `Approve ${request.patientName}'s request and move them into Consultations (Waiting).`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Patient:</span>{" "}
            {request.patientName}
          </p>
          <p>
            <span className="text-muted-foreground">Service:</span>{" "}
            {request.service}
          </p>
          <p>
            <span className="text-muted-foreground">Preferred:</span>{" "}
            {formatRequestDate(request.preferredDate)}{" "}
            {request.preferredTime || ""}
            {request.queueNumber != null ? ` · #${request.queueNumber}` : ""}
          </p>
        </div>

        {isAdmit ? (
          <p className="text-sm text-muted-foreground">
            Creates a queue reservation for this patient&apos;s preferred date
            (may exceed daily capacity).
          </p>
        ) : (
          <div className="space-y-3">
            <Field>
              <FieldLabel>Assign doctor</FieldLabel>
              <Select
                value={doctorId || "__none__"}
                onValueChange={(value) =>
                  setDoctorId(value === "__none__" ? "" : (value ?? ""))
                }
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Schedule</FieldLabel>
              <Input
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel>Consultation room</FieldLabel>
              <Input
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                placeholder="Room A"
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                rows={3}
                disabled={pending}
              />
            </Field>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={handleConfirm}>
            {isAdmit ? "Admit to queue" : "Confirm approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
