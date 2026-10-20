"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
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
import { formatRequestPreferred } from "@/features/requests/lib/format"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { consultationProviderLabel } from "@/lib/health/consultation-workflow"
import {
  isoToManilaDatetimeLocal,
  manilaDatetimeLocalToIso,
} from "@/lib/health/clinic-datetime"
import { selectItemsRecord } from "@/lib/ui/select-label"
import { cn } from "@/lib/utils"
import type { AppointmentRequest } from "@/types/appointmentRequest"
import { IconUser } from "@tabler/icons-react"

const fieldInputClassName = cn(
  "h-10 rounded-xl border-input bg-input/30 shadow-none",
  "[&::-webkit-calendar-picker-indicator]:opacity-60",
  "[&::-webkit-calendar-picker-indicator]:hover:opacity-100"
)

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
  const [approvalNotes, setApprovalNotes] = useState("")

  useEffect(() => {
    if (!open || !request) return
    setDoctorId(request.doctorId ?? "")
    // Prefer Manila preferredDate/time; never ISO.slice (UTC hours → 9 PM shows as 1 PM).
    const fromPreferred =
      request.preferredDate && request.preferredTime
        ? `${request.preferredDate}T${request.preferredTime}`
        : ""
    setScheduleAt(
      fromPreferred ||
        (request.startsAt ? isoToManilaDatetimeLocal(request.startsAt) : "")
    )
    setApprovalNotes("")
    void listAssignableDoctorsAction().then((result) => {
      if (result.ok) setDoctors(result.data)
    })
  }, [open, request])

  const doctorOptions = useMemo(() => {
    if (!request?.doctorId) return doctors
    if (doctors.some((doctor) => doctor.id === request.doctorId)) return doctors
    const fallbackName = request.doctorName?.trim()
    if (!fallbackName) return doctors
    return [
      { id: request.doctorId, fullName: fallbackName, email: null },
      ...doctors,
    ]
  }, [doctors, request?.doctorId, request?.doctorName])

  const doctorSelectItems = useMemo(() => {
    const entries: { value: string; label: string }[] = [
      { value: "__none__", label: "Unassigned" },
      ...doctorOptions.map((doctor) => ({
        value: doctor.id,
        label: doctor.fullName,
      })),
    ]
    if (
      doctorId &&
      !doctorOptions.some((doctor) => doctor.id === doctorId)
    ) {
      entries.push({
        value: doctorId,
        label:
          request?.doctorName?.trim() ||
          (doctorId ? "Assigned doctor" : "Select doctor"),
      })
    }
    return selectItemsRecord(entries)
  }, [doctorId, doctorOptions, request?.doctorName])

  if (!request) return null

  const isAdmit = mode === "admit" || request.status === "waitlisted"
  const selectedDoctorMissing =
    Boolean(doctorId) &&
    !doctorOptions.some((doctor) => doctor.id === doctorId)
  const selectedDoctorLabel =
    request.doctorName?.trim() ||
    (doctorId ? "Assigned doctor" : "Select doctor")
  const serviceLabel = displayConsultationLabel(
    request.service,
    request.reason
  )
  const preferredLabel = formatRequestPreferred(
    request.preferredDate,
    request.preferredTime
  )
  const preferredWithQueue =
    preferredLabel !== "—"
      ? [
          preferredLabel,
          request.queueNumber != null ? `#${request.queueNumber}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "—"

  const summaryRows = [
    {
      label: "Specialty",
      value: consultationProviderLabel(request.providerType),
    },
    ...(serviceLabel !== "—"
      ? [{ label: "Service", value: serviceLabel }]
      : []),
    { label: "Preferred", value: preferredWithQueue },
  ]

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

      const doctor = doctorOptions.find((item) => item.id === doctorId)
      const result = await approveConsultationRequestAction({
        id: request!.id,
        doctorId: doctorId || null,
        doctorName: doctor?.fullName ?? request!.doctorName ?? null,
        scheduleAt: scheduleAt ? manilaDatetimeLocalToIso(scheduleAt) : null,
        location: request!.location ?? null,
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="gap-1.5 border-b border-border px-6 py-5 pr-12 text-left">
          <DialogTitle>
            {isAdmit ? "Admit From Waitlist" : "Approve Consultation Request"}
          </DialogTitle>
          <DialogDescription>
            {isAdmit
              ? "Move this student into the queue for their preferred date."
              : "Confirm the schedule, then move them into Consultations (Waiting)."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-5">
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
            <div className="flex items-start gap-3 px-4 py-3.5">
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
                  {request.patientName}
                </p>
              </div>
            </div>

            <dl className="grid gap-2.5 border-t border-border/70 px-4 py-3.5 text-sm">
              {summaryRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 font-medium text-foreground/80">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {isAdmit ? (
            <p className="rounded-xl bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
              Creates a queue reservation for this patient&apos;s preferred
              date (may exceed daily capacity).
            </p>
          ) : (
            <div className="space-y-4">
              <Field className="gap-2">
                <FieldLabel>Assign doctor</FieldLabel>
                <Select
                  value={doctorId || "__none__"}
                  items={doctorSelectItems}
                  onValueChange={(value) =>
                    setDoctorId(value === "__none__" ? "" : (value ?? ""))
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-input bg-input/30 shadow-none">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {selectedDoctorMissing ? (
                      <SelectItem value={doctorId}>
                        {selectedDoctorLabel}
                      </SelectItem>
                    ) : null}
                    {doctorOptions.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field className="gap-2">
                <FieldLabel>Schedule</FieldLabel>
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(event) => setScheduleAt(event.target.value)}
                  disabled={pending}
                  className={fieldInputClassName}
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel>Notes</FieldLabel>
                <Textarea
                  value={approvalNotes}
                  onChange={(event) => setApprovalNotes(event.target.value)}
                  placeholder="Optional note for the care team"
                  rows={3}
                  disabled={pending}
                  className="min-h-24 resize-none shadow-none"
                />
              </Field>
            </div>
          )}
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
          <Button type="button" disabled={pending} onClick={handleConfirm}>
            {pending
              ? isAdmit
                ? "Admitting…"
                : "Approving…"
              : isAdmit
                ? "Admit to queue"
                : "Confirm approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
