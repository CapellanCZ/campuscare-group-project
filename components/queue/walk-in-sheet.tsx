"use client"

import { useEffect, useRef, useState, useTransition } from "react"
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
import { selectItemsRecord } from "@/lib/ui/select-label"
import {
  isCampusIdReadyForLookup,
  studentIdDigits,
} from "@/lib/students/student-id-input"
import {
  patientFullName,
  patientTypeLabel,
  CAMPUS_ID_LABEL,
  type PatientType,
} from "@/types/patientRecord"
import { IconUserPlus } from "@tabler/icons-react"

const WALK_IN_PATIENT_TYPES = [
  "student",
  "faculty",
  "employee",
  "visitor",
] as const
type WalkInPatientType = (typeof WALK_IN_PATIENT_TYPES)[number]

const LOOKUP_DEBOUNCE_MS = 400

function walkInTypeFromRecord(type: PatientType): WalkInPatientType {
  if (type === "student") return "student"
  if (type === "faculty") return "faculty"
  if (type === "employee") return "employee"
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
  const lookupGen = useRef(0)
  const campusIdDigitsRef = useRef("")

  useEffect(() => {
    campusIdDigitsRef.current = studentIdDigits(campusId)
  }, [campusId])

  useEffect(() => {
    // Debounce lookup only — never rewrite campusId from effects.
    const timer = window.setTimeout(() => {
      setDebouncedCampusId(campusId.trim())
    }, LOOKUP_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [campusId])

  useEffect(() => {
    const id = debouncedCampusId
    const digits = studentIdDigits(id)

    if (!id || !isCampusIdReadyForLookup(id)) {
      setLookupPending(false)
      setLookupHint(null)
      setNameAutoFilled(false)
      setPatientType("")
      setPatientName("")
      return
    }

    const gen = ++lookupGen.current
    const startedDigits = digits
    let cancelled = false
    setLookupPending(true)
    setLookupHint(null)

    void searchPatientByStudentIdAction(id).then((result) => {
      if (cancelled || gen !== lookupGen.current) return
      // If the user kept typing, discard this result — never touch campusId.
      if (campusIdDigitsRef.current !== startedDigits) {
        setLookupPending(false)
        return
      }
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
    lookupGen.current += 1
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

    const backendPatientType: PatientType = patientType

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
      <DialogContent className="flex max-h-[min(90vh,640px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="gap-1 border-b px-4 py-4 text-left sm:px-6">
          <DialogTitle>Register walk-in</DialogTitle>
          <DialogDescription className="text-xs">
            Enter the {CAMPUS_ID_LABEL.toLowerCase()} first. The system will look
            up the patient record and fill in the name when found.
          </DialogDescription>
        </DialogHeader>
        <form
          key={formKey}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
          onSubmit={onSubmit}
        >
          <Field>
            <FieldLabel htmlFor="walkin-campus">{CAMPUS_ID_LABEL}</FieldLabel>
            <CampusIdInput
              id="walkin-campus"
              value={campusId}
              onChange={setCampusId}
              placeholder="Enter ID Number"
              aria-label={CAMPUS_ID_LABEL}
              disabled={pending}
              showValidation
            />
            {lookupPending ? (
              <p className="text-xs text-muted-foreground">
                Looking up patient…
              </p>
            ) : lookupHint ? (
              <p className="text-xs text-muted-foreground">{lookupHint}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Leave blank for visitors without an{" "}
                {CAMPUS_ID_LABEL.toLowerCase()}. Enter an ID to look up an
                existing patient record.
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
            <Button
              type="submit"
              disabled={pending || lookupPending}
              className="w-full"
            >
              {pending ? "Registering…" : "Register to nurse queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
