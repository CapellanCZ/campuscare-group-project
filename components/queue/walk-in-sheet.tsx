"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { SelectWithOtherField } from "@/components/shared/select-with-other-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { CONSULTATION_TYPE_OPTIONS } from "@/lib/health/form-options"
import { CampusIdInput } from "@/components/shared/campus-id-input"
import { actionRegisterWalkIn } from "@/lib/health/queue-server-actions"
import {
  PATIENT_TYPES,
  patientTypeLabel,
  patientTypeRequiresCampusId,
  type PatientType,
} from "@/types/patientRecord"
import { IconUserPlus } from "@tabler/icons-react"

const DEFAULT_CONSULTATION = "Walk-in consultation"

function campusIdLabel(type: PatientType): string {
  if (type === "faculty" || type === "employee") {
    return patientTypeRequiresCampusId(type)
      ? "Employee / Faculty ID"
      : "Employee / Faculty ID (optional)"
  }
  if (type === "visitor") return "Student ID Number (optional)"
  return "Student ID Number"
}

export function WalkInSheet({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
} = {}) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [pending, startTransition] = useTransition()
  const [patientName, setPatientName] = useState("")
  const [patientType, setPatientType] = useState<PatientType>("student")
  const [campusId, setCampusId] = useState("")
  const [consultationType, setConsultationType] = useState(DEFAULT_CONSULTATION)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  const idRequired = patientTypeRequiresCampusId(patientType)

  function resetForm() {
    setPatientName("")
    setPatientType("student")
    setCampusId("")
    setConsultationType(DEFAULT_CONSULTATION)
    setError(null)
    setFormKey((key) => key + 1)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!patientName.trim()) {
      setError("Enter the patient name.")
      return
    }
    if (idRequired && !campusId.trim()) {
      setError(
        patientType === "student"
          ? "Student ID is required for students."
          : "ID is required for faculty and employees."
      )
      return
    }
    if (!consultationType.trim()) {
      setError("Choose a consultation type, or specify Other.")
      return
    }

    startTransition(async () => {
      const result = await actionRegisterWalkIn({
        patientName,
        studentId: campusId.trim() || undefined,
        patientType,
        consultationType: consultationType.trim(),
        providerQueue: "nurse",
      })

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(result.message ?? "Walk-in registered")
      setOpen(false)
      resetForm()
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      {hideTrigger ? null : (
        <DialogTrigger render={<Button variant="outline" />}>
          <IconUserPlus data-icon="inline-start" aria-hidden />
          Register walk-in
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b px-6 py-4 text-left">
          <DialogTitle>Register walk-in</DialogTitle>
          <DialogDescription className="text-xs">
            Check-in starts at the nurse station for vitals and specialty
            assignment.
          </DialogDescription>
        </DialogHeader>
        <form
          key={formKey}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          onSubmit={onSubmit}
        >
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="walkin-name">Patient name</FieldLabel>
            <Input
              id="walkin-name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full name"
              required
              disabled={pending}
              autoComplete="name"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="walkin-patient-type">Patient type</FieldLabel>
            <Select
              value={patientType}
              onValueChange={(value) => {
                const next = (value ?? "student") as PatientType
                setPatientType(next)
                if (!patientTypeRequiresCampusId(next)) {
                  // keep any typed ID but no longer required
                }
              }}
              disabled={pending}
            >
              <SelectTrigger id="walkin-patient-type" className="w-full">
                <SelectValue placeholder="Select patient type" />
              </SelectTrigger>
              <SelectContent>
                {PATIENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {patientTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="walkin-campus">
              {campusIdLabel(patientType)}
              {idRequired ? "" : ""}
            </FieldLabel>
            <CampusIdInput
              id="walkin-campus"
              value={campusId}
              onChange={setCampusId}
              placeholder={
                patientType === "faculty" || patientType === "employee"
                  ? "Employee ID"
                  : "2023-171863"
              }
              aria-label={campusIdLabel(patientType)}
              disabled={pending}
            />
          </Field>

          <SelectWithOtherField
            id="walkin-type"
            label="Consultation type"
            options={CONSULTATION_TYPE_OPTIONS}
            value={consultationType}
            onValueChange={setConsultationType}
            placeholder="Select consultation type"
            otherPlaceholder="e.g. Vaccination, counseling…"
            disabled={pending}
            required
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="mt-auto px-0 sm:justify-stretch">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Registering…" : "Register to nurse queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
