"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"

import {
  createConsultationAction,
  updateConsultationAction,
} from "@/features/consultations/actions"
import {
  ensurePatientRecordAction,
  listPatientOptionsAction,
} from "@/features/patients/actions"
import { isEnrolledVirtualId } from "@/lib/students/virtual-id"
import { NO_STUDENT_FOUND } from "@/lib/students/types"
import { SelectWithOtherField } from "@/components/shared/select-with-other-field"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { CHIEF_COMPLAINT_OPTIONS } from "@/lib/health/form-options"
import {
  DENTAL_CHIEF_COMPLAINT_OPTIONS,
  DENTAL_DIAGNOSIS_OPTIONS,
  DENTAL_TREATMENT_OPTIONS,
  formatDentalAssessment,
  formatDentalPrescription,
  parseDentalAssessment,
  parseDentalPrescription,
} from "@/lib/health/dental-form-options"
import { cn } from "@/lib/utils"
import type { StaffAccess } from "@/lib/auth/types"
import {
  CONSULTATION_PRIORITIES,
  CONSULTATION_STATUSES,
  type Consultation,
  type ConsultationPriority,
  type ConsultationStatus,
  type CreateConsultationInput,
} from "@/types/consultation"
import {
  patientCampusId,
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"

type FormState = {
  patientId: string
  chiefComplaint: string
  symptoms: string
  assessment: string
  diagnosis: string
  treatment: string
  prescription: string
  providerName: string
  providerRole: string
  station: string
  status: ConsultationStatus
  priority: ConsultationPriority
  consultationDate: string
  followUpDate: string
  notes: string
  oralFindings: string
  teethCondition: string
  gumCondition: string
  softTissue: string
  rxMedication: string
  rxDosage: string
  rxFrequency: string
  rxDuration: string
  followUpRequired: "yes" | "no"
}

const emptyForm: FormState = {
  patientId: "",
  chiefComplaint: "",
  symptoms: "",
  assessment: "",
  diagnosis: "",
  treatment: "",
  prescription: "",
  providerName: "",
  providerRole: "",
  station: "nurse",
  status: "Awaiting Assessment",
  priority: "Normal",
  consultationDate: "",
  followUpDate: "",
  notes: "",
  oralFindings: "",
  teethCondition: "",
  gumCondition: "",
  softTissue: "",
  rxMedication: "",
  rxDosage: "",
  rxFrequency: "",
  rxDuration: "",
  followUpRequired: "no",
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function toForm(
  consultation: Consultation | null,
  defaults?: { station?: string; providerName?: string; providerRole?: string }
): FormState {
  if (!consultation) {
    return {
      ...emptyForm,
      consultationDate: toDatetimeLocalValue(new Date().toISOString()),
      station: defaults?.station ?? "nurse",
      providerName: defaults?.providerName ?? "",
      providerRole: defaults?.providerRole ?? "",
      status:
        defaults?.station === "dentist" || defaults?.station === "physician"
          ? "In Progress"
          : "Awaiting Assessment",
    }
  }
  const exam = parseDentalAssessment(consultation.assessment)
  const rx = parseDentalPrescription(consultation.prescription)
  return {
    patientId: consultation.patientId,
    chiefComplaint: consultation.chiefComplaint ?? "",
    symptoms: consultation.symptoms ?? "",
    assessment: consultation.assessment ?? "",
    diagnosis: consultation.diagnosis ?? "",
    treatment: consultation.treatment ?? "",
    prescription: consultation.prescription ?? "",
    providerName: consultation.providerName ?? "",
    providerRole: consultation.providerRole ?? "",
    station: consultation.station ?? "nurse",
    status: consultation.status,
    priority: consultation.priority,
    consultationDate: toDatetimeLocalValue(consultation.consultationDate),
    followUpDate: consultation.followUpDate ?? "",
    notes: consultation.notes ?? "",
    oralFindings: exam.oralFindings,
    teethCondition: exam.teethCondition,
    gumCondition: exam.gumCondition,
    softTissue: exam.softTissue,
    rxMedication: rx.medication,
    rxDosage: rx.dosage,
    rxFrequency: rx.frequency,
    rxDuration: rx.duration,
    followUpRequired: consultation.followUpDate ? "yes" : "no",
  }
}

function toInput(
  form: FormState,
  dentalMode: boolean,
  options?: { mode?: "create" | "edit"; access?: StaffAccess }
): CreateConsultationInput {
  const assessment = dentalMode
    ? formatDentalAssessment({
        oralFindings: form.oralFindings,
        teethCondition: form.teethCondition,
        gumCondition: form.gumCondition,
        softTissue: form.softTissue,
      })
    : form.assessment
  const prescription = dentalMode
    ? formatDentalPrescription({
        medication: form.rxMedication,
        dosage: form.rxDosage,
        frequency: form.rxFrequency,
        duration: form.rxDuration,
      })
    : form.prescription

  const isCreate = options?.mode === "create"
  const station = isCreate
    ? options?.access?.designation === "dentist"
      ? "dentist"
      : options?.access?.designation === "physician"
        ? "physician"
        : "nurse"
    : form.station

  return {
    patientId: form.patientId,
    chiefComplaint: form.chiefComplaint,
    symptoms: form.symptoms,
    assessment,
    diagnosis: form.diagnosis,
    treatment: form.treatment,
    prescription,
    providerName: isCreate
      ? (options?.access?.fullName ?? form.providerName)
      : form.providerName,
    providerRole: isCreate
      ? (options?.access?.designation ?? form.providerRole)
      : form.providerRole,
    station,
    status: form.status,
    priority: form.priority,
    consultationDate: isCreate
      ? new Date().toISOString()
      : fromDatetimeLocalValue(form.consultationDate),
    followUpDate:
      dentalMode && form.followUpRequired === "no" ? "" : form.followUpDate,
    notes: form.notes,
  }
}

export function ConsultationFormSheet({
  open,
  onOpenChange,
  mode,
  consultation,
  onSaved,
  access,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  consultation: Consultation | null
  onSaved: (consultation: Consultation) => void
  access?: StaffAccess
}) {
  const dentalMode =
    access?.designation === "dentist" ||
    consultation?.station === "dentist" ||
    false
  const [form, setForm] = useState<FormState>(emptyForm)
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [patientOpen, setPatientOpen] = useState(false)
  const [patientQuery, setPatientQuery] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setForm(
      toForm(mode === "edit" ? consultation : null, {
        station:
          access?.designation === "dentist"
            ? "dentist"
            : access?.designation === "physician"
              ? "physician"
              : "nurse",
        providerName: access?.fullName ?? "",
        providerRole: access?.designation ?? "",
      })
    )
  }, [open, mode, consultation, access])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void listPatientOptionsAction(patientQuery).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        if (result.error === NO_STUDENT_FOUND) {
          setPatients([])
          toast.error(NO_STUDENT_FOUND)
          return
        }
        toast.error(result.error)
        return
      }
      setPatients(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [open, patientQuery])

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === form.patientId) ?? null,
    [patients, form.patientId]
  )

  async function selectPatient(patient: PatientRecord) {
    if (!isEnrolledVirtualId(patient.id)) {
      update("patientId", patient.id)
      setPatientOpen(false)
      return
    }
    const result = await ensurePatientRecordAction(patient)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setPatients((prev) => {
      const withoutVirtual = prev.filter((item) => item.id !== patient.id)
      if (withoutVirtual.some((item) => item.id === result.data.id)) {
        return withoutVirtual.map((item) =>
          item.id === result.data.id ? result.data : item
        )
      }
      return [result.data, ...withoutVirtual]
    })
    update("patientId", result.data.id)
    setPatientOpen(false)
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(complete = false) {
    const nextForm = complete
      ? { ...form, status: "Completed" as ConsultationStatus }
      : form
    const input = toInput(nextForm, dentalMode, { mode, access })
    if (!input.patientId.trim()) {
      toast.error("Patient is required.")
      return
    }
    if (!input.chiefComplaint?.trim()) {
      toast.error("Chief complaint is required.")
      return
    }
    startTransition(async () => {
      const result =
        mode === "edit" && consultation
          ? await updateConsultationAction({ ...input, id: consultation.id })
          : await createConsultationAction(input)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(
        complete
          ? "Consultation completed."
          : mode === "edit"
            ? "Consultation updated."
            : "Consultation saved."
      )
      onOpenChange(false)
      onSaved(result.data)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {dentalMode
              ? mode === "edit"
                ? "Edit dental consultation"
                : "Dental consultation"
              : mode === "edit"
                ? "Edit consultation"
                : "Create consultation"}
          </SheetTitle>
          <SheetDescription>
            {dentalMode
              ? "Record oral examination, diagnosis, treatment, and follow-up for dental patients."
              : "Patient selection comes from patient records. Only patient_id is stored on the consultation."}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel>Patient *</FieldLabel>
              <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {selectedPatient
                          ? `${patientFullName(selectedPatient)} · ${patientCampusId(selectedPatient) ?? "No ID"}`
                          : consultation?.patient.fullName
                            ? `${consultation.patient.fullName} · ${consultation.patient.studentId}`
                            : "Search patient records"}
                      </span>
                      <IconChevronDown className="size-4 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search by Student ID Number"
                      value={patientQuery}
                      onValueChange={setPatientQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {patientQuery.trim()
                          ? NO_STUDENT_FOUND
                          : "No enrolled students."}
                      </CommandEmpty>
                      <CommandGroup>
                        {patients.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            value={patient.id}
                            onSelect={() => {
                              void selectPatient(patient)
                            }}
                          >
                            <IconCheck
                              className={cn(
                                "mr-2 size-4",
                                form.patientId === patient.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">
                              {patientFullName(patient)} ·{" "}
                              {patientCampusId(patient) ?? "No ID"}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Field>

            <SelectWithOtherField
              key={`${consultation?.id ?? "consult-create"}-complaint`}
              id="chiefComplaint"
              label="Chief complaint *"
              options={
                dentalMode
                  ? DENTAL_CHIEF_COMPLAINT_OPTIONS
                  : CHIEF_COMPLAINT_OPTIONS
              }
              value={form.chiefComplaint}
              onValueChange={(value) => update("chiefComplaint", value)}
              placeholder="Select complaint"
              otherPlaceholder="Describe the complaint…"
              required
            />

            {dentalMode ? (
              <>
                <p className="text-sm font-medium">Dental examination</p>
                <Field>
                  <FieldLabel htmlFor="oralFindings">
                    Oral examination findings
                  </FieldLabel>
                  <Textarea
                    id="oralFindings"
                    value={form.oralFindings}
                    onChange={(e) => update("oralFindings", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="teethCondition">Teeth condition</FieldLabel>
                  <Textarea
                    id="teethCondition"
                    value={form.teethCondition}
                    onChange={(e) => update("teethCondition", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="gumCondition">Gum condition</FieldLabel>
                  <Textarea
                    id="gumCondition"
                    value={form.gumCondition}
                    onChange={(e) => update("gumCondition", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="softTissue">
                    Oral soft tissue findings
                  </FieldLabel>
                  <Textarea
                    id="softTissue"
                    value={form.softTissue}
                    onChange={(e) => update("softTissue", e.target.value)}
                  />
                </Field>
                <SelectWithOtherField
                  key={`${consultation?.id ?? "consult-create"}-dx`}
                  id="diagnosis"
                  label="Diagnosis"
                  options={DENTAL_DIAGNOSIS_OPTIONS}
                  value={form.diagnosis}
                  onValueChange={(value) => update("diagnosis", value)}
                  placeholder="Select diagnosis"
                  otherPlaceholder="Custom diagnosis…"
                />
                <SelectWithOtherField
                  key={`${consultation?.id ?? "consult-create"}-tx`}
                  id="treatment"
                  label="Treatment provided"
                  options={DENTAL_TREATMENT_OPTIONS}
                  value={form.treatment}
                  onValueChange={(value) => update("treatment", value)}
                  placeholder="Select treatment"
                  otherPlaceholder="Custom treatment…"
                />
                <p className="text-sm font-medium">Prescription</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="rxMedication">Medication</FieldLabel>
                    <Input
                      id="rxMedication"
                      value={form.rxMedication}
                      onChange={(e) => update("rxMedication", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="rxDosage">Dosage</FieldLabel>
                    <Input
                      id="rxDosage"
                      value={form.rxDosage}
                      onChange={(e) => update("rxDosage", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="rxFrequency">Frequency</FieldLabel>
                    <Input
                      id="rxFrequency"
                      value={form.rxFrequency}
                      onChange={(e) => update("rxFrequency", e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="rxDuration">Duration</FieldLabel>
                    <Input
                      id="rxDuration"
                      value={form.rxDuration}
                      onChange={(e) => update("rxDuration", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Follow-up required</FieldLabel>
                    <Select
                      value={form.followUpRequired}
                      onValueChange={(value) => {
                        if (value === "yes" || value === "no") {
                          update("followUpRequired", value)
                          if (value === "no") update("followUpDate", "")
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="followUpDate">Follow-up date</FieldLabel>
                    <Input
                      id="followUpDate"
                      type="date"
                      disabled={form.followUpRequired !== "yes"}
                      value={form.followUpDate}
                      onChange={(e) => update("followUpDate", e.target.value)}
                    />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="symptoms">Symptoms</FieldLabel>
                  <Textarea
                    id="symptoms"
                    value={form.symptoms}
                    onChange={(e) => update("symptoms", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="assessment">Assessment</FieldLabel>
                  <Textarea
                    id="assessment"
                    value={form.assessment}
                    onChange={(e) => update("assessment", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="diagnosis">Diagnosis</FieldLabel>
                  <Textarea
                    id="diagnosis"
                    value={form.diagnosis}
                    onChange={(e) => update("diagnosis", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="treatment">Treatment</FieldLabel>
                  <Textarea
                    id="treatment"
                    value={form.treatment}
                    onChange={(e) => update("treatment", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="prescription">Prescription</FieldLabel>
                  <Textarea
                    id="prescription"
                    value={form.prescription}
                    onChange={(e) => update("prescription", e.target.value)}
                  />
                </Field>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Priority</FieldLabel>
                <Select
                  value={form.priority}
                  onValueChange={(value) => {
                    if (value)
                      update("priority", value as ConsultationPriority)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSULTATION_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    if (value) update("status", value as ConsultationStatus)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSULTATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {dentalMode ? null : (
              <Field>
                <FieldLabel htmlFor="followUpDate">Follow-up date</FieldLabel>
                <Input
                  id="followUpDate"
                  type="date"
                  value={form.followUpDate}
                  onChange={(e) => update("followUpDate", e.target.value)}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="notes">
                {dentalMode ? "Consultation notes / additional instructions" : "Notes"}
              </FieldLabel>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-row">
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={pending} />
            }
          >
            Cancel
          </SheetClose>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleSubmit(false)}
          >
            {pending
              ? "Saving…"
              : mode === "edit"
                ? "Update consultation"
                : "Save consultation"}
          </Button>
          {dentalMode ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => handleSubmit(true)}
            >
              {pending ? "Completing…" : "Complete consultation"}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
