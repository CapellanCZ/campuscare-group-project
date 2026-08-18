"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"

import {
  createMedicalCertificateAction,
  updateMedicalCertificateAction,
} from "@/features/certificates/actions"
import {
  ensureCertificatePatientByStudentIdAction,
  listEnrolledCertificatePatientsAction,
} from "@/features/patients/actions"
import { certificateStatusLabel } from "@/features/certificates/lib/format"
import { isEnrolledVirtualId } from "@/lib/students/virtual-id"
import { formatStudentIdInput } from "@/lib/students/student-id-input"
import { NO_STUDENT_FOUND } from "@/lib/students/types"
import { DENTIST_PATIENT_SEARCH_PLACEHOLDER } from "@/lib/students/patient-search-copy"
import { useOptionalStaffAccess } from "@/components/staff-access-provider"
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { CERTIFICATE_PURPOSE_OPTIONS } from "@/lib/health/form-options"
import { cn } from "@/lib/utils"
import {
  MEDICAL_CERTIFICATE_STATUSES,
  type MedicalCertificate,
  type MedicalCertificatePatient,
  type MedicalCertificateStatus,
} from "@/types/medicalCertificate"

const CERTIFICATE_TYPES = [
  "Medical excuse",
  "Medical certificate",
  "Fitness for internship",
  "Fitness for duty",
  "Dental clearance",
] as const

const CERTIFICATE_TYPE_OPTIONS = CERTIFICATE_TYPES.map((type) => ({
  value: type,
  label: type,
}))

type FormState = {
  patientId: string
  certificateNumber: string
  certificateType: string
  purpose: string
  doctorName: string
  remarks: string
  status: MedicalCertificateStatus
  issuedAt: string
  validUntil: string
}

const emptyForm: FormState = {
  patientId: "",
  certificateNumber: "",
  certificateType: "Medical excuse",
  purpose: "",
  doctorName: "",
  remarks: "",
  status: "draft",
  issuedAt: "",
  validUntil: "",
}

function toDatetimeLocalValue(iso: string | null): string {
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

function certificateToForm(certificate: MedicalCertificate): FormState {
  return {
    patientId: certificate.patientId,
    certificateNumber: certificate.certificateNumber,
    certificateType: certificate.certificateType,
    purpose: certificate.purpose ?? "",
    doctorName: certificate.doctorName ?? "",
    remarks: certificate.remarks ?? "",
    status: certificate.status,
    issuedAt: toDatetimeLocalValue(certificate.issuedAt),
    validUntil: certificate.validUntil ?? "",
  }
}

function validateForm(form: FormState, mode: "create" | "edit"): string | null {
  if (mode === "create" && !form.patientId) {
    return "Please select a patient."
  }
  if (!form.certificateType.trim()) {
    return "Certificate type is required."
  }
  if (!form.purpose.trim()) {
    return "Purpose is required."
  }
  if (mode === "edit" && !form.certificateNumber.trim()) {
    return "Certificate number is required."
  }
  if (
    (form.status === "issued" || form.status === "printed") &&
    !form.doctorName.trim()
  ) {
    return "Doctor name is required for issued or printed certificates."
  }
  if (
    (form.status === "issued" || form.status === "printed") &&
    !form.issuedAt.trim()
  ) {
    return "Issue date is required for issued or printed certificates."
  }
  if (form.issuedAt && Number.isNaN(new Date(form.issuedAt).getTime())) {
    return "Issue date is invalid."
  }
  if (form.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(form.validUntil)) {
    return "Valid until must use YYYY-MM-DD."
  }
  return null
}

function PatientSearchSelect({
  patients,
  value,
  disabled,
  loading,
  onChange,
}: {
  patients: MedicalCertificatePatient[]
  value: string
  disabled?: boolean
  loading?: boolean
  onChange: (patient: MedicalCertificatePatient) => void
}) {
  const designation = useOptionalStaffAccess()?.designation
  const searchPlaceholder =
    designation === "dentist"
      ? DENTIST_PATIENT_SEARCH_PLACEHOLDER
      : "Search by Student ID Number"
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [resolving, setResolving] = useState(false)
  const [resolved, setResolved] = useState<MedicalCertificatePatient | null>(
    null
  )
  const selected = useMemo(
    () =>
      patients.find((patient) => patient.id === value) ??
      (resolved?.id === value ? resolved : null),
    [patients, resolved, value]
  )

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return patients
    return patients.filter((patient) => patient.studentId?.trim() === q)
  }, [patients, query])

  async function selectPatient(patient: MedicalCertificatePatient) {
    if (!isEnrolledVirtualId(patient.id)) {
      setResolved(patient)
      onChange(patient)
      setOpen(false)
      return
    }
    const studentId = patient.studentId?.trim()
    if (!studentId) {
      toast.error(NO_STUDENT_FOUND)
      return
    }
    setResolving(true)
    try {
      const result = await ensureCertificatePatientByStudentIdAction(studentId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setResolved(result.data)
      onChange(result.data)
      setOpen(false)
    } finally {
      setResolving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading || resolving}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {loading || resolving
                ? resolving
                  ? "Syncing student?"
                  : "Loading patients?"
                : selected
                  ? `${selected.fullName}${
                      selected.studentId ? ` ? ${selected.studentId}` : ""
                    }`
                  : searchPlaceholder}
            </span>
            <IconChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={(value) => setQuery(formatStudentIdInput(value))}
          />
          <CommandList>
            <CommandEmpty>
              {query.trim() ? NO_STUDENT_FOUND : "No enrolled students."}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((patient) => {
                const label = `${patient.fullName}${
                  patient.studentId ? ` ? ${patient.studentId}` : ""
                }`
                return (
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
                        value === patient.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function CertificateFormBody({
  mode,
  certificate,
  defaultDoctorName,
  hideDoctorNameField,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit"
  certificate: MedicalCertificate | null
  defaultDoctorName: string
  hideDoctorNameField: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (certificate: MedicalCertificate) => void
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (certificate && mode === "edit") return certificateToForm(certificate)
    return {
      ...emptyForm,
      doctorName: defaultDoctorName,
    }
  })
  const [patients, setPatients] = useState<MedicalCertificatePatient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(mode === "create")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (mode !== "create") return

    let cancelled = false
    void listEnrolledCertificatePatientsAction().then((result) => {
      if (cancelled) return
      setLoadingPatients(false)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      setPatients(result.data)
    })

    return () => {
      cancelled = true
    }
  }, [mode])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resolvedDoctorName() {
    if (hideDoctorNameField) {
      return (
        form.doctorName.trim() ||
        defaultDoctorName.trim() ||
        certificate?.doctorName?.trim() ||
        ""
      )
    }
    return form.doctorName.trim()
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const doctorName = resolvedDoctorName()
    const formForValidation = { ...form, doctorName }
    const validationError = validateForm(formForValidation, mode)
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      let issuedAt = fromDatetimeLocalValue(form.issuedAt)
      if (
        (form.status === "issued" || form.status === "printed") &&
        !issuedAt
      ) {
        issuedAt = new Date().toISOString()
      }

      if (mode === "create") {
        const result = await createMedicalCertificateAction({
          patientId: form.patientId,
          certificateNumber: form.certificateNumber.trim() || undefined,
          certificateType: form.certificateType.trim(),
          purpose: form.purpose.trim() || null,
          doctorName: doctorName || null,
          remarks: form.remarks.trim() || null,
          status: form.status,
          issuedAt,
          validUntil: form.validUntil.trim() || null,
        })

        if (!result.ok) {
          setError(result.error)
          toast.error(result.error)
          return
        }

        toast.success("Medical certificate created.")
        onOpenChange(false)
        onSaved(result.data)
        return
      }

      if (!certificate) {
        setError("Certificate not found.")
        toast.error("Certificate not found.")
        return
      }

      const result = await updateMedicalCertificateAction({
        id: certificate.id,
        certificateNumber: form.certificateNumber.trim(),
        certificateType: form.certificateType.trim(),
        purpose: form.purpose.trim() || null,
        doctorName: doctorName || null,
        remarks: form.remarks.trim() || null,
        status: form.status,
        issuedAt,
        validUntil: form.validUntil.trim() || null,
      })

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success("Medical certificate updated.")
      onOpenChange(false)
      onSaved(result.data)
    })
  }

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>
          {mode === "create"
            ? "New medical certificate"
            : "Edit medical certificate"}
        </SheetTitle>
      </SheetHeader>

      <form
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
        onSubmit={onSubmit}
      >
        <FieldGroup>
          {mode === "create" ? (
            <Field data-invalid={error && !form.patientId ? true : undefined}>
              <FieldLabel>Patient</FieldLabel>
              <PatientSearchSelect
                patients={patients}
                value={form.patientId}
                loading={loadingPatients}
                disabled={pending}
                onChange={(patient) => {
                  setPatients((prev) =>
                    prev.some((item) => item.id === patient.id)
                      ? prev
                      : [patient, ...prev]
                  )
                  updateField("patientId", patient.id)
                }}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel>Patient</FieldLabel>
              <Input
                value={
                  certificate
                    ? `${certificate.patient.fullName}${
                        certificate.patient.studentId
                          ? ` ? ${certificate.patient.studentId}`
                          : ""
                      }`
                    : "?"
                }
                disabled
                readOnly
              />
            </Field>
          )}

          <SelectWithOtherField
            key={`${certificate?.id ?? "cert-create"}-type`}
            id="cert-type"
            label="Certificate type"
            options={CERTIFICATE_TYPE_OPTIONS}
            value={form.certificateType}
            onValueChange={(value) => updateField("certificateType", value)}
            placeholder="Select certificate type"
            otherOptionLabel="Others"
            otherLabel="Specify type"
            otherPlaceholder="Specify certificate type"
            required
            disabled={pending}
          />

          <SelectWithOtherField
            key={certificate?.id ?? "cert-create"}
            id="cert-purpose"
            label="Purpose"
            options={CERTIFICATE_PURPOSE_OPTIONS}
            value={form.purpose}
            onValueChange={(value) => updateField("purpose", value)}
            placeholder="Select purpose"
            otherPlaceholder="Reason for issuing this certificate"
            required
            disabled={pending}
          />

          {hideDoctorNameField ? null : (
            <Field>
              <FieldLabel htmlFor="cert-doctor">Doctor name</FieldLabel>
              <Input
                id="cert-doctor"
                value={form.doctorName}
                onChange={(event) =>
                  updateField("doctorName", event.target.value)
                }
                placeholder="Attending clinician"
                disabled={pending}
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="cert-issued-at">Issue date</FieldLabel>
            <Input
              id="cert-issued-at"
              type="datetime-local"
              value={form.issuedAt}
              onChange={(event) => updateField("issuedAt", event.target.value)}
              disabled={pending}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cert-valid-until">Valid until</FieldLabel>
            <Input
              id="cert-valid-until"
              type="date"
              value={form.validUntil}
              onChange={(event) =>
                updateField("validUntil", event.target.value)
              }
              disabled={pending}
            />
          </Field>

          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={form.status}
              onValueChange={(value) =>
                updateField(
                  "status",
                  (value as MedicalCertificateStatus) ?? "draft"
                )
              }
              disabled={pending}
            >
              <SelectTrigger className="w-full" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDICAL_CERTIFICATE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {certificateStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {mode === "edit" ? (
            <Field>
              <FieldLabel htmlFor="cert-number">Certificate number</FieldLabel>
              <Input
                id="cert-number"
                value={form.certificateNumber}
                onChange={(event) =>
                  updateField("certificateNumber", event.target.value)
                }
                required
                disabled={pending}
              />
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="cert-remarks">Remarks</FieldLabel>
            <Textarea
              id="cert-remarks"
              value={form.remarks}
              onChange={(event) => updateField("remarks", event.target.value)}
              placeholder="Optional clinical notes"
              disabled={pending}
              rows={3}
            />
          </Field>
        </FieldGroup>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <SheetFooter className="mt-auto px-0 sm:flex-row">
          <Button type="submit" disabled={pending || loadingPatients}>
            {pending
              ? mode === "create"
                ? "Creating?"
                : "Saving?"
              : mode === "create"
                ? "Create certificate"
                : "Save changes"}
          </Button>
          <SheetClose
            render={
              <Button type="button" variant="outline" disabled={pending} />
            }
          >
            Cancel
          </SheetClose>
        </SheetFooter>
      </form>
    </>
  )
}

export function CertificateFormSheet({
  open,
  mode,
  certificate,
  defaultDoctorName = "",
  hideDoctorNameField = false,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  mode: "create" | "edit"
  certificate: MedicalCertificate | null
  defaultDoctorName?: string
  hideDoctorNameField?: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (certificate: MedicalCertificate) => void
}) {
  const formKey =
    mode === "edit" ? `edit-${certificate?.id ?? "unknown"}` : "create"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg print:hidden">
        {open ? (
          <CertificateFormBody
            key={formKey}
            mode={mode}
            certificate={certificate}
            defaultDoctorName={defaultDoctorName}
            hideDoctorNameField={hideDoctorNameField}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
