"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"

import {
  createConsultationAction,
  updateConsultationAction,
} from "@/features/consultations/actions"
import { listPatientOptionsAction } from "@/features/patients/actions"
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
import { cn } from "@/lib/utils"
import {
  CONSULTATION_PRIORITIES,
  CONSULTATION_STATIONS,
  CONSULTATION_STATUSES,
  type Consultation,
  type ConsultationPriority,
  type ConsultationStatus,
  type CreateConsultationInput,
} from "@/types/consultation"
import {
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

function toForm(consultation: Consultation | null): FormState {
  if (!consultation) {
    return {
      ...emptyForm,
      consultationDate: toDatetimeLocalValue(new Date().toISOString()),
    }
  }
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
  }
}

function toInput(form: FormState): CreateConsultationInput {
  return {
    patientId: form.patientId,
    chiefComplaint: form.chiefComplaint,
    symptoms: form.symptoms,
    assessment: form.assessment,
    diagnosis: form.diagnosis,
    treatment: form.treatment,
    prescription: form.prescription,
    providerName: form.providerName,
    providerRole: form.providerRole,
    station: form.station,
    status: form.status,
    priority: form.priority,
    consultationDate: fromDatetimeLocalValue(form.consultationDate),
    followUpDate: form.followUpDate,
    notes: form.notes,
  }
}

export function ConsultationFormSheet({
  open,
  onOpenChange,
  mode,
  consultation,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  consultation: Consultation | null
  onSaved: (consultation: Consultation) => void
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [patientOpen, setPatientOpen] = useState(false)
  const [patientQuery, setPatientQuery] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) setForm(toForm(mode === "edit" ? consultation : null))
  }, [open, mode, consultation])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void listPatientOptionsAction(patientQuery).then((result) => {
      if (cancelled) return
      if (!result.ok) {
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

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    const input = toInput(form)
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
        mode === "edit" ? "Consultation updated." : "Consultation created."
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
            {mode === "edit" ? "Edit consultation" : "Create consultation"}
          </SheetTitle>
          <SheetDescription>
            Patient selection comes from patient records. Only patient_id is
            stored on the consultation.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <FieldGroup className="gap-4">
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
                          ? `${patientFullName(selectedPatient)} · ${selectedPatient.studentId}`
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
                      placeholder="Search name or student ID"
                      value={patientQuery}
                      onValueChange={setPatientQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No patients found.</CommandEmpty>
                      <CommandGroup>
                        {patients.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            value={patient.id}
                            onSelect={() => {
                              update("patientId", patient.id)
                              setPatientOpen(false)
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
                              {patientFullName(patient)} · {patient.studentId}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Field>

            <Field>
              <FieldLabel htmlFor="chiefComplaint">Chief complaint *</FieldLabel>
              <Input
                id="chiefComplaint"
                value={form.chiefComplaint}
                onChange={(e) => update("chiefComplaint", e.target.value)}
              />
            </Field>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="providerName">Provider</FieldLabel>
                <Input
                  id="providerName"
                  value={form.providerName}
                  onChange={(e) => update("providerName", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="providerRole">Provider role</FieldLabel>
                <Input
                  id="providerRole"
                  value={form.providerRole}
                  onChange={(e) => update("providerRole", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Station</FieldLabel>
                <Select
                  value={form.station}
                  onValueChange={(value) => {
                    if (value) update("station", value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Station" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSULTATION_STATIONS.map((station) => (
                      <SelectItem key={station} value={station}>
                        {station}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <Field>
                <FieldLabel htmlFor="consultationDate">
                  Consultation date
                </FieldLabel>
                <Input
                  id="consultationDate"
                  type="datetime-local"
                  value={form.consultationDate}
                  onChange={(e) => update("consultationDate", e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="followUpDate">Follow-up date</FieldLabel>
              <Input
                id="followUpDate"
                type="date"
                value={form.followUpDate}
                onChange={(e) => update("followUpDate", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>

        <SheetFooter>
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={pending} />
            }
          >
            Cancel
          </SheetClose>
          <Button type="button" disabled={pending} onClick={handleSubmit}>
            {pending
              ? mode === "edit"
                ? "Saving…"
                : "Creating…"
              : mode === "edit"
                ? "Save changes"
                : "Create consultation"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
