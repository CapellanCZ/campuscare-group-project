"use client"

import { useEffect, useState, useTransition } from "react"
import {
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconTrash,
} from "@tabler/icons-react"
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
  addConsultationRequestNoteAction,
  approveConsultationRequestAction,
  declineConsultationRequestAction,
  deleteConsultationRequestNoteAction,
  fetchConsultationRequestByIdAction,
  listAssignableDoctorsAction,
  rescheduleConsultationRequestAction,
  updateConsultationRequestNoteAction,
  updateConsultationRequestStatusAction,
} from "@/features/requests/actions"
import {
  consultationRequestStatusLabel,
  formatRequestDate,
  formatRequestDateTime,
} from "@/features/requests/lib/format"
import {
  extensionIconLabel,
  formatFileSize,
  isImageMime,
} from "@/lib/attachments/file-types"
import {
  CONSULTATION_REQUEST_STATUSES,
  type ConsultationRequest,
  type ConsultationRequestStatus,
} from "@/types/consultationRequest"

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
  request: ConsultationRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canApprove: boolean
  canDecline: boolean
  canReschedule: boolean
  onUpdated: (request: ConsultationRequest) => void
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
  const [noteBody, setNoteBody] = useState("")
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteBody, setEditingNoteBody] = useState("")
  const [statusValue, setStatusValue] = useState<ConsultationRequestStatus>(
    "pending"
  )

  useEffect(() => {
    if (!open || !request) return
    setDoctorId(request.assignedDoctorId ?? "")
    setScheduleAt(
      request.scheduleAt
        ? request.scheduleAt.slice(0, 16)
        : ""
    )
    setRoom(request.consultationRoom ?? "")
    setApprovalNotes(request.approvalNotes ?? "")
    setDeclineReason("")
    setRescheduleDate(request.preferredDate ?? "")
    setRescheduleTime(request.preferredTime ?? "")
    setRescheduleReason("")
    setNoteBody("")
    setEditingNoteId(null)
    setStatusValue(request.status)

    void listAssignableDoctorsAction().then((result) => {
      if (result.ok) setDoctors(result.data)
    })
  }, [open, request])

  if (!request) return null

  const history = request.medicalHistory
  const images = request.attachments.filter(
    (item) => item.category === "image" || isImageMime(item.mimeType)
  )
  const files = request.attachments.filter(
    (item) => !(item.category === "image" || isImageMime(item.mimeType))
  )

  function refreshFrom(result: {
    ok: true
    data: ConsultationRequest
  } | { ok: false; error: string }) {
    if (!result.ok) {
      toast.error(result.error)
      return false
    }
    onUpdated(result.data)
    return true
  }

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
            <Badge
              variant={
                request.status === "declined" || request.status === "cancelled"
                  ? "destructive"
                  : request.status === "approved" ||
                      request.status === "completed"
                    ? "default"
                    : "secondary"
              }
            >
              {consultationRequestStatusLabel(request.status)}
            </Badge>
            {request.status === "declined" ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="text-sm font-medium text-destructive">
                  Status: Declined
                </p>
                <p className="mt-1 text-sm text-foreground">
                  <span className="font-medium">Reason:</span>{" "}
                  {request.declineReason?.trim() ||
                    "No reason was provided."}
                </p>
              </div>
            ) : null}
          </div>

          <dl>
            <DetailRow label="Patient Name" value={request.patientName} />
            <DetailRow label="Student ID" value={request.studentId} />
            <DetailRow label="Course" value={request.course} />
            <DetailRow label="Year" value={request.yearLevel} />
            <DetailRow label="Email" value={request.email} />
            <DetailRow label="Phone Number" value={request.phone} />
            <DetailRow label="Requested Service" value={request.service} />
            <DetailRow
              label="Preferred Date"
              value={formatRequestDate(request.preferredDate)}
            />
            <DetailRow label="Preferred Time" value={request.preferredTime} />
            <DetailRow label="Reason" value={request.reason} />
            <DetailRow label="Symptoms" value={request.symptoms} />
            <DetailRow
              label="Additional Notes"
              value={request.additionalNotes}
            />
            <DetailRow
              label="Submission Date"
              value={formatRequestDateTime(request.submittedAt)}
            />
            <DetailRow
              label="Assigned Nurse"
              value={request.assignedNurseName}
            />
            <DetailRow
              label="Assigned Doctor"
              value={request.assignedDoctorName}
            />
            <DetailRow
              label="Consultation Room"
              value={request.consultationRoom}
            />
            {request.status !== "declined" && request.declineReason ? (
              <DetailRow label="Decline Reason" value={request.declineReason} />
            ) : null}
            {request.rescheduleReason ? (
              <DetailRow
                label="Reschedule Reason"
                value={request.rescheduleReason}
              />
            ) : null}
          </dl>

          <Section title="Medical History">
            {!history?.hasRecords ? (
              <p className="text-sm text-muted-foreground">
                No previous medical records found.
              </p>
            ) : (
              <dl>
                <DetailRow label="Allergies" value={history.allergies} />
                <DetailRow
                  label="Current Medications"
                  value={history.currentMedications}
                />
                <DetailRow
                  label="Existing Conditions"
                  value={history.medicalConditions}
                />
                <DetailRow
                  label="Vaccination History"
                  value={history.vaccinationHistory}
                />
                <DetailRow
                  label="Previous Clinic Visits"
                  value={
                    history.previousVisits.length
                      ? history.previousVisits
                          .map(
                            (visit) =>
                              `${formatRequestDate(visit.date)} · ${visit.chiefComplaint || visit.status}`
                          )
                          .join("; ")
                      : "—"
                  }
                />
                <DetailRow
                  label="Previous Consultations"
                  value={
                    history.previousConsultations.length
                      ? history.previousConsultations
                          .map(
                            (item) =>
                              `${formatRequestDateTime(item.date)} · ${item.service} (${item.status})`
                          )
                          .join("; ")
                      : "—"
                  }
                />
                <DetailRow
                  label="Previous Certificates"
                  value={
                    history.previousCertificates.length
                      ? history.previousCertificates
                          .map(
                            (item) =>
                              `${item.certificateNumber} · ${item.certificateType}`
                          )
                          .join("; ")
                      : "—"
                  }
                />
              </dl>
            )}
          </Section>

          <Section title="Supporting Files">
            {request.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No supporting files uploaded.
              </p>
            ) : (
              <div className="space-y-3">
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {images.map((image) => (
                      <div key={image.id} className="space-y-1">
                        {image.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image.url}
                            alt={image.fileName}
                            className="aspect-square w-full rounded-xl border object-cover"
                          />
                        ) : null}
                        <p className="truncate text-xs">{image.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRequestDateTime(image.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border px-3 py-2"
                  >
                    {file.mimeType === "application/pdf" ? (
                      <IconFileTypePdf className="size-5 text-muted-foreground" />
                    ) : (
                      <div className="flex size-9 flex-col items-center justify-center rounded-md border bg-muted/40">
                        <IconFile className="size-3.5 text-muted-foreground" />
                        <span className="text-[9px] font-medium text-muted-foreground">
                          {extensionIconLabel(file.fileName)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)} ·{" "}
                        {formatRequestDateTime(file.createdAt)}
                      </p>
                    </div>
                    {file.url ? (
                      <Button
                        size="xs"
                        variant="outline"
                        render={
                          <a
                            href={file.url}
                            download={file.fileName}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                        nativeButton={false}
                      >
                        <IconDownload className="size-3.5" />
                        Download
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Timeline">
            {request.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline yet.</p>
            ) : (
              <ol className="space-y-4 border-l pl-5">
                {request.timeline.map((item) => (
                  <li key={item.id} className="relative space-y-1">
                    <span className="absolute -left-[23px] top-1.5 size-2.5 rounded-full bg-foreground" />
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {formatRequestDateTime(item.createdAt)}
                      {item.actorName ? ` · ${item.actorName}` : ""}
                    </p>
                    {item.remarks ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.remarks}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Audit Log">
            {request.auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries.</p>
            ) : (
              <ul className="space-y-3">
                {request.auditLog.map((item) => (
                  <li key={item.id} className="text-sm leading-relaxed">
                    <span className="font-medium">{item.event}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatRequestDateTime(item.createdAt)}
                      {item.actorName ? ` · ${item.actorName}` : ""}
                    </span>
                    {item.details ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {item.details}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Internal Notes">
            <p className="text-xs text-muted-foreground">
              Visible to clinic staff only. Students never see these notes.
            </p>
            <div className="space-y-3">
              {request.notes.map((note) => (
                <div key={note.id} className="rounded-xl border p-4">
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingNoteBody}
                        onChange={(event) =>
                          setEditingNoteBody(event.target.value)
                        }
                        rows={3}
                        disabled={pending}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result =
                                await updateConsultationRequestNoteAction(
                                  note.id,
                                  editingNoteBody
                                )
                              if (!result.ok) {
                                toast.error(result.error)
                                return
                              }
                              toast.success("Note updated.")
                              setEditingNoteId(null)
                              const refreshed =
                                await fetchConsultationRequestByIdAction(
                                  request.id
                                )
                              if (refreshed.ok) onUpdated(refreshed.data)
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setEditingNoteId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {note.authorName} ·{" "}
                          {formatRequestDateTime(note.updatedAt)}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              setEditingNoteId(note.id)
                              setEditingNoteBody(note.body)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const result =
                                  await deleteConsultationRequestNoteAction(
                                    note.id
                                  )
                                if (!result.ok) {
                                  toast.error(result.error)
                                  return
                                }
                                toast.success("Note deleted.")
                                const refreshed =
                                  await fetchConsultationRequestByIdAction(
                                    request.id
                                  )
                                if (refreshed.ok) onUpdated(refreshed.data)
                              })
                            }
                          >
                            <IconTrash className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <Textarea
                placeholder="Add an internal clinic note"
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                rows={3}
                disabled={pending}
              />
              <Button
                size="sm"
                disabled={pending || !noteBody.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await addConsultationRequestNoteAction(
                      request.id,
                      noteBody
                    )
                    if (!result.ok) {
                      toast.error(result.error)
                      return
                    }
                    toast.success("Note added.")
                    setNoteBody("")
                    const refreshed =
                      await fetchConsultationRequestByIdAction(request.id)
                    if (refreshed.ok) onUpdated(refreshed.data)
                  })
                }
              >
                Add note
              </Button>
            </div>
          </Section>

          <Section title="Status Management">
            <div className="flex flex-wrap items-end gap-2">
              <Field className="min-w-40 flex-1">
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={statusValue}
                  onValueChange={(value) =>
                    setStatusValue(
                      (value as ConsultationRequestStatus) ?? request.status
                    )
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSULTATION_REQUEST_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {consultationRequestStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button
                size="sm"
                disabled={pending || statusValue === request.status}
                onClick={() =>
                  startTransition(async () => {
                    const result = await updateConsultationRequestStatusAction({
                      id: request.id,
                      status: statusValue,
                    })
                    if (!refreshFrom(result)) return
                    toast.success("Status updated.")
                  })
                }
              >
                Update status
              </Button>
            </div>
          </Section>

          {canApprove && request.status === "pending" ? (
            <Section title="Approve Consultation">
              <div className="space-y-4">
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
                        consultationRoom: room,
                        notes: approvalNotes,
                      })
                      if (!refreshFrom(result)) return
                      toast.success("Request approved and queued.")
                    })
                  }
                >
                  Approve & queue
                </Button>
              </div>
            </Section>
          ) : null}

          {canDecline && request.status === "pending" ? (
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
                    toast.success("Request declined.")
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
            request.status === "approved") ? (
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
                    toast.success("Request rescheduled.")
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
