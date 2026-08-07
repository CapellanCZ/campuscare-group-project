"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  admitConsultationRequestAction,
  approveConsultationRequestAction,
  declineConsultationRequestAction,
  listAssignableDoctorsAction,
  rescheduleConsultationRequestAction,
} from "@/features/requests/actions"
import {
  consultationRequestStatusLabel,
  formatRequestDate,
  formatRequestDateTime,
} from "@/features/requests/lib/format"
import {
  type AppointmentRequest,
} from "@/types/appointmentRequest"

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 border-b py-4 last:border-b-0 sm:grid-cols-[170px_1fr] sm:gap-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-relaxed text-foreground">{value || "—"}</dd>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 border-t pt-6">
      <h3 className="text-sm font-medium tracking-tight">{title}</h3>
      {children}
    </section>
  )
}

export function ConsultationRequestDetailSheet({
  request,
  open,
  onOpenChange,
  canApprove,
  canDecline,
  canReschedule,
  onUpdated,
}: {
  request: AppointmentRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canApprove: boolean
  canDecline: boolean
  canReschedule: boolean
  onUpdated: (request: AppointmentRequest) => void
}) {
  const [pending, startTransition] = useTransition()
  const [doctors, setDoctors] = useState<
    { id: string; fullName: string; email: string | null }[]
  >([])
  const [doctorId, setDoctorId] = useState<string>("")
  const [scheduleAt, setScheduleAt] = useState("")
  const [room, setRoom] = useState("")
  const [approvalNotes, setApprovalNotes] = useState("")
  const [declineReason, setDeclineReason] = useState("")
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleTime, setRescheduleTime] = useState("")
  const [rescheduleReason, setRescheduleReason] = useState("")

  useEffect(() => {
    if (!open || !request) return
    setDoctorId(request.doctorId ?? "")
    setScheduleAt(request.startsAt ? request.startsAt.slice(0, 16) : "")
    setRoom(request.location ?? "")
    setApprovalNotes("")
    setDeclineReason("")
    setRescheduleDate(request.preferredDate ?? "")
    setRescheduleTime(request.preferredTime ?? "")
    setRescheduleReason("")

    void listAssignableDoctorsAction().then((result) => {
      if (result.ok) setDoctors(result.data)
    })
  }, [open, request])

  if (!request) return null

  function refreshFrom(result: {
    ok: true
    data: AppointmentRequest
  } | { ok: false; error: string }) {
    if (!result.ok) {
      toast.error(result.error)
      return false
    }
    onUpdated(result.data)
    return true
  }

  const statusTone =
    request.status === "cancelled" || request.status === "no_show"
      ? "destructive"
      : request.status === "confirmed" || request.status === "completed"
        ? "default"
        : request.status === "waitlisted"
          ? "outline"
          : "secondary"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader className="gap-2 border-b">
          <SheetTitle className="pr-8 text-lg">{request.patientName}</SheetTitle>
          <SheetDescription>
            {request.service} · {consultationRequestStatusLabel(request.status)}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5 pb-8">
          <div className="space-y-4">
            <Badge variant={statusTone}>
              {consultationRequestStatusLabel(request.status)}
            </Badge>
            {request.status === "cancelled" ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="text-sm font-medium text-destructive">
                  Status: Cancelled
                </p>
                <p className="mt-1 text-sm text-foreground">
                  <span className="font-medium">Reason:</span>{" "}
                  {request.cancellationReason?.trim() ||
                    "No reason was provided."}
                </p>
              </div>
            ) : null}
          </div>

          <dl>
            <DetailRow label="Patient Name" value={request.patientName} />
            <DetailRow label="Student ID" value={request.studentId} />
            <DetailRow label="Email" value={request.email} />
            <DetailRow label="Phone Number" value={request.phone} />
            <DetailRow label="Requested Service" value={request.service} />
            <DetailRow
              label="Provider type"
              value={
                request.providerType === "dentist" ? "Dentist" : "Physician"
              }
            />
            <DetailRow
              label="Queue number"
              value={
                request.queueNumber != null
                  ? String(request.queueNumber)
                  : "—"
              }
            />
            {request.recommendComeEarly ? (
              <DetailRow
                label="Recommendation"
                value="Come early and keep the scheduled date (queue #1–5)."
              />
            ) : null}
            <DetailRow
              label="Preferred Date"
              value={formatRequestDate(request.preferredDate)}
            />
            <DetailRow label="Preferred Time" value={request.preferredTime} />
            <DetailRow label="Reason" value={request.reason} />
            <DetailRow
              label="Submitted"
              value={formatRequestDateTime(request.createdAt)}
            />
            <DetailRow label="Assigned Doctor" value={request.doctorName} />
            <DetailRow label="Location" value={request.location} />
            {request.cancellationReason && request.status !== "cancelled" ? (
              <DetailRow
                label="Cancellation Reason"
                value={request.cancellationReason}
              />
            ) : null}
          </dl>

          {canApprove && request.status === "pending" ? (
            <Section title="Approve Consultation">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Confirms the existing reservation
                  {request.queueNumber != null
                    ? ` (queue #${request.queueNumber})`
                    : ""}
                  . Does not assign a new number.
                </p>
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
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const doctor = doctors.find((item) => item.id === doctorId)
                      const result = await approveConsultationRequestAction({
                        id: request.id,
                        doctorId: doctorId || null,
                        doctorName: doctor?.fullName ?? null,
                        scheduleAt: scheduleAt
                          ? new Date(scheduleAt).toISOString()
                          : null,
                        location: room,
                        notes: approvalNotes,
                      })
                      if (!refreshFrom(result)) return
                      toast.success("Appointment confirmed.")
                    })
                  }
                >
                  Approve request
                </Button>
              </div>
            </Section>
          ) : null}

          {canApprove && request.status === "waitlisted" ? (
            <Section title="Admit from waitlist">
              <p className="mb-3 text-sm text-muted-foreground">
                Creates a queue reservation for this patient&apos;s preferred
                date (may exceed daily capacity).
              </p>
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await admitConsultationRequestAction(
                      request.id,
                      true
                    )
                    if (!refreshFrom(result)) return
                    toast.success("Patient admitted from waitlist.")
                  })
                }
              >
                Admit to queue
              </Button>
            </Section>
          ) : null}

          {canDecline &&
          (request.status === "pending" || request.status === "waitlisted") ? (
            <Section title="Decline Consultation">
              <Field>
                <FieldLabel>Decline reason</FieldLabel>
                <Textarea
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                  rows={3}
                  required
                  disabled={pending}
                />
              </Field>
              <Button
                variant="destructive"
                disabled={pending || !declineReason.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await declineConsultationRequestAction({
                      id: request.id,
                      reason: declineReason,
                    })
                    if (!refreshFrom(result)) return
                    toast.success("Appointment cancelled.")
                  })
                }
              >
                Decline request
              </Button>
            </Section>
          ) : null}

          {canReschedule &&
          (request.status === "pending" ||
            request.status === "rescheduled" ||
            request.status === "confirmed" ||
            request.status === "waitlisted") ? (
            <Section title="Reschedule">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>New date</FieldLabel>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={(event) => setRescheduleDate(event.target.value)}
                    disabled={pending}
                  />
                </Field>
                <Field>
                  <FieldLabel>New time</FieldLabel>
                  <Input
                    type="time"
                    value={rescheduleTime}
                    onChange={(event) => setRescheduleTime(event.target.value)}
                    disabled={pending}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Reschedule reason</FieldLabel>
                <Textarea
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  rows={3}
                  disabled={pending}
                />
              </Field>
              <Button
                variant="outline"
                disabled={
                  pending ||
                  !rescheduleDate ||
                  !rescheduleTime ||
                  !rescheduleReason.trim()
                }
                onClick={() =>
                  startTransition(async () => {
                    const result = await rescheduleConsultationRequestAction({
                      id: request.id,
                      preferredDate: rescheduleDate,
                      preferredTime: rescheduleTime,
                      reason: rescheduleReason,
                    })
                    if (!refreshFrom(result)) return
                    toast.success("Appointment rescheduled.")
                  })
                }
              >
                Save reschedule
              </Button>
            </Section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
