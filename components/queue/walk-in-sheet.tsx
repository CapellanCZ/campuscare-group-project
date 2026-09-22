"use client"

import { useEffect, useState, useTransition } from "react"
import { appToast } from "@/lib/feedback/app-toast"
import { queueToasts } from "@/lib/feedback/toast-messages"
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
import { searchPatientByStudentIdAction } from "@/features/patients/actions"
import { normalizeEmployeeCampusId } from "@/lib/students/student-id-input"
import { selectItemsRecord } from "@/lib/ui/select-label"
import {
  patientFullName,
  patientTypeLabel,
  CAMPUS_ID_LABEL,
  type PatientType,
} from "@/types/patientRecord"
import { IconUserPlus } from "@tabler/icons-react"

const WALK_IN_PATIENT_TYPES = ["student", "employee", "visitor"] as const
type WalkInPatientType = (typeof WALK_IN_PATIENT_TYPES)[number]

function walkInTypeFromRecord(type: PatientType): WalkInPatientType {
  if (type === "student") return "student"
  if (type === "faculty" || type === "employee") return "employee"
  return "visitor"
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
  const [campusId, setCampusId] = useState("")
  const [debouncedCampusId, setDebouncedCampusId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientType, setPatientType] = useState<WalkInPatientType | "">("")
  const [consultationType, setConsultationType] = useState("")
  const [lookupHint, setLookupHint] = useState<string | null>(null)
  const [lookupPending, setLookupPending] = useState(false)
  const [nameAutoFilled, setNameAutoFilled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = campusId.trim()
      const normalized =
        raw && !/^\d{4}-\d{6}$/.test(raw)
          ? normalizeEmployeeCampusId(raw) || raw
          : raw
      if (normalized !== campusId && /^\d{4}-\d{5}$/.test(normalized)) {
        setCampusId(normalized)
      }
      setDebouncedCampusId(normalized)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [campusId])

  useEffect(() => {
    const id = debouncedCampusId
    if (!id) {
      setLookupHint(null)
      setNameAutoFilled(false)
      setPatientType("")
      return
    }

    let cancelled = false
    setLookupPending(true)
    setLookupHint(null)

    void searchPatientByStudentIdAction(id).then((result) => {
      if (cancelled) return
      setLookupPending(false)

      if (result.ok) {
        setPatientName(patientFullName(result.data))
        setPatientType(walkInTypeFromRecord(result.data.patientType))
        setNameAutoFilled(true)
        setLookupHint(
          "Patient record found. Name and type were filled automatically."
        )
        return
      }

      // No university patient record → treat as visitor (not affiliated).
      setNameAutoFilled(false)
      setPatientType("visitor")
      setLookupHint(
        "No patient record found — registering as a visitor. Enter the full name manually."
      )
    })

    return () => {
      cancelled = true
    }
  }, [debouncedCampusId])

  function resetForm() {
    setCampusId("")
    setDebouncedCampusId("")
    setPatientName("")
    setPatientType("")
    setConsultationType("")
    setLookupHint(null)
    setNameAutoFilled(false)
    setError(null)
    setFormKey((key) => key + 1)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!patientName.trim()) {
      setError("Enter the patient's full name.")
      return
    }
    if (!patientType) {
      setError("Select a patient type.")
      return
    }
    if (patientType !== "visitor" && !campusId.trim()) {
      setError(
        `${CAMPUS_ID_LABEL} is required for ${patientTypeLabel(patientType).toLowerCase()}s.`
      )
      return
    }
    if (!consultationType.trim()) {
      setError("Choose a consultation type, or specify Other.")
      return
    }

    const backendPatientType: PatientType =
      patientType === "employee" ? "employee" : patientType

    startTransition(async () => {
      const result = await actionRegisterWalkIn({
        patientName,
        studentId: campusId.trim() || undefined,
        patientType: backendPatientType,
        consultationType: consultationType.trim(),
        providerQueue: "nurse",
      })

      if (!result.ok) {
        setError(result.error)
        queueToasts.failed(result.error)
        return
      }

      appToast.success({
        title: result.message ?? "Walk-in registered",
        description: "The walk-in patient has been added to the queue.",
      })
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
            Enter the {CAMPUS_ID_LABEL.toLowerCase()} first. The system will look up the patient record
            and fill in the name when found.
          </DialogDescription>
        </DialogHeader>
        <form
          key={formKey}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          onSubmit={onSubmit}
        >
          <Field>
            <FieldLabel htmlFor="walkin-campus">{CAMPUS_ID_LABEL}</FieldLabel>
            <CampusIdInput
              id="walkin-campus"
              value={campusId}
              onChange={setCampusId}
              patientType={!patientType || patientType === "visitor" ? "any" : patientType}
              placeholder="Enter ID Number"
              aria-label={CAMPUS_ID_LABEL}
              disabled={pending}
            />
            {lookupPending ? (
              <p className="text-xs text-muted-foreground">Looking up patient…</p>
            ) : lookupHint ? (
              <p className="text-xs text-muted-foreground">{lookupHint}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Leave blank for visitors without an {CAMPUS_ID_LABEL.toLowerCase()}.
              </p>
            )}
          </Field>

          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="walkin-name">Full name</FieldLabel>
            <Input
              id="walkin-name"
              value={patientName}
              onChange={(e) => {
                setPatientName(e.target.value)
                setNameAutoFilled(false)
              }}
              placeholder="Enter Full Name"
              required
              disabled={pending || (nameAutoFilled && lookupPending)}
              autoComplete="name"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="walkin-patient-type">Patient type</FieldLabel>
            <Select
              value={patientType || null}
              items={selectItemsRecord(
                WALK_IN_PATIENT_TYPES.map((type) => ({
                  value: type,
                  label: patientTypeLabel(type),
                }))
              )}
              onValueChange={(value) => {
                setPatientType(
                  value &&
                    (WALK_IN_PATIENT_TYPES as readonly string[]).includes(value)
                    ? (value as WalkInPatientType)
                    : ""
                )
              }}
              disabled={pending}
            >
              <SelectTrigger id="walkin-patient-type" className="w-full">
                <SelectValue placeholder="Select Patient Type" />
              </SelectTrigger>
              <SelectContent>
                {WALK_IN_PATIENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {patientTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <SelectWithOtherField
            id="walkin-type"
            label="Consultation type"
            options={CONSULTATION_TYPE_OPTIONS}
            value={consultationType}
            onValueChange={setConsultationType}
            placeholder="Select Consultation Type"
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
            <Button type="submit" disabled={pending || lookupPending} className="w-full">
              {pending ? "Registering…" : "Register to nurse queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
