"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { appToast } from "@/lib/feedback/app-toast"
import { queueToasts } from "@/lib/feedback/toast-messages"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconChevronDown,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
import { Switch } from "@/components/ui/switch"
import { CONSULTATION_TYPE_OPTIONS } from "@/lib/health/form-options"
import { actionRegisterWalkIn } from "@/lib/health/queue-server-actions"
import { searchPatientsBySurnameAction } from "@/features/patients/actions"
import { selectItemsRecord } from "@/lib/ui/select-label"
import {
  patientCampusId,
  patientFullName,
  patientTypeLabel,
  CAMPUS_ID_LABEL,
  type PatientSurnameMatch,
  type PatientType,
} from "@/types/patientRecord"
import { cn } from "@/lib/utils"

const WALK_IN_PATIENT_TYPES = [
  "student",
  "faculty",
  "employee",
  "visitor",
] as const
type WalkInPatientType = (typeof WALK_IN_PATIENT_TYPES)[number]

const LOOKUP_DEBOUNCE_MS = 250
const SURNAME_MIN_CHARS = 1

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
  triggerClassName,
  /** Local source of truth — reload queue after Supabase insert. */
  onRegistered,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  triggerClassName?: string
  onRegistered?: () => void
} = {}) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [pending, startTransition] = useTransition()

  const [surnameQuery, setSurnameQuery] = useState("")
  const [debouncedSurname, setDebouncedSurname] = useState("")
  const [pickerOpen, setPickerOpen] = useState(false)
  const [matches, setMatches] = useState<PatientSurnameMatch[]>([])
  const [lookupPending, setLookupPending] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSurnameMatch | null>(null)

  const [patientName, setPatientName] = useState("")
  const [campusId, setCampusId] = useState("")
  const [patientType, setPatientType] = useState<WalkInPatientType | "">("")
  const [consultationType, setConsultationType] = useState("")
  const [emergency, setEmergency] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const lookupGen = useRef(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSurname(surnameQuery.trim())
    }, LOOKUP_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [surnameQuery])

  useEffect(() => {
    if (selectedPatient) return

    const q = debouncedSurname
    if (q.length < SURNAME_MIN_CHARS) {
      setMatches([])
      setLookupPending(false)
      setLookupError(null)
      return
    }

    const gen = ++lookupGen.current
    let cancelled = false
    setLookupPending(true)
    setLookupError(null)

    void searchPatientsBySurnameAction(q)
      .then((result) => {
        if (cancelled || gen !== lookupGen.current) return
        if (result.ok) {
          setMatches(result.data)
          setLookupError(null)
          return
        }
        setMatches([])
        setLookupError(result.error || "Could not search patient records.")
      })
      .catch((error: unknown) => {
        if (cancelled || gen !== lookupGen.current) return
        setMatches([])
        const message =
          error instanceof TypeError ||
          (error instanceof Error &&
            /failed to fetch|network/i.test(error.message))
            ? "Connection interrupted — try again (refresh if the app just reloaded)."
            : "Could not reach patient records."
        setLookupError(message)
      })
      .finally(() => {
        if (cancelled || gen !== lookupGen.current) return
        setLookupPending(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedSurname, selectedPatient])

  function selectPatient(patient: PatientSurnameMatch) {
    setSelectedPatient(patient)
    setPatientName(patientFullName(patient))
    setPatientType(walkInTypeFromRecord(patient.patientType))
    setCampusId(patientCampusId(patient) ?? "")
    setSurnameQuery(patient.lastName)
    setPickerOpen(false)
    setMatches([])
    setError(null)
  }

  function clearSelectedPatient() {
    lookupGen.current += 1
    setSelectedPatient(null)
    setPatientName("")
    setCampusId("")
    setPatientType("")
    setSurnameQuery("")
    setDebouncedSurname("")
    setMatches([])
    setLookupPending(false)
    setLookupError(null)
  }

  function resetForm() {
    lookupGen.current += 1
    setSurnameQuery("")
    setDebouncedSurname("")
    setPickerOpen(false)
    setMatches([])
    setLookupPending(false)
    setLookupError(null)
    setSelectedPatient(null)
    setPatientName("")
    setCampusId("")
    setPatientType("")
    setConsultationType("")
    setEmergency(false)
    setError(null)
    setFormKey((key) => key + 1)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!patientName.trim()) {
      setError(
        selectedPatient
          ? "Patient name is missing from the record."
          : "Search a surname and pick a patient, or enter a full name for a visitor."
      )
      return
    }
    if (!patientType) {
      setError("Select a patient type.")
      return
    }
    if (patientType !== "visitor" && !campusId.trim()) {
      setError(
        `${CAMPUS_ID_LABEL} is required for ${patientTypeLabel(patientType).toLowerCase()}s. Pick a patient record or switch type to Visitor.`
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
        emergency,
      })

      if (!result.ok) {
        setError(result.error)
        queueToasts.failed(result.error)
        return
      }

      appToast.success({
        title: result.message ?? "Walk-in registered",
        description: emergency
          ? "Emergency patient was moved to the front of the nurse queue."
          : "The walk-in patient has been added to the queue.",
      })
      setOpen(false)
      resetForm()
      // Prefer local SoT reload (cache + soft fetch); RSC refresh alone is not enough.
      onRegistered?.()
      router.refresh()
    })
  }

  const showManualName = !selectedPatient

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      {hideTrigger ? null : (
        <DialogTrigger
          render={
            <Button
              size="sm"
              variant="outline"
              className={triggerClassName}
            />
          }
        >
          <IconUserPlus data-icon="inline-start" aria-hidden />
          Register walk-in
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[min(92vh,720px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 gap-1.5 border-b border-border px-5 py-4 pr-12 text-left sm:px-6 sm:py-5">
          <DialogTitle>Register walk-in</DialogTitle>
          <DialogDescription>
            Search by surname in patient records. Mark Emergency to place them
            at the front of the nurse queue.
          </DialogDescription>
        </DialogHeader>

        <form
          key={formKey}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={onSubmit}
        >
          <FieldGroup className="min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain px-5 py-4 sm:gap-5 sm:px-6 sm:py-5">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="walkin-surname">Surname</FieldLabel>
              {selectedPatient ? (
                <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {patientFullName(selectedPatient)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {patientTypeLabel(selectedPatient.patientType)}
                      {campusId ? ` · ${campusId}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="size-7 shrink-0"
                    aria-label="Clear selected patient"
                    title="Clear selection"
                    disabled={pending}
                    onClick={clearSelectedPatient}
                  >
                    <IconX className="size-3.5" aria-hidden />
                  </Button>
                </div>
              ) : (
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        id="walkin-surname"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={pickerOpen}
                        disabled={pending}
                        className="h-10 w-full justify-between font-normal"
                      >
                        <span className="truncate text-muted-foreground">
                          Search by surname
                        </span>
                        <IconChevronDown
                          className="size-4 shrink-0 opacity-50"
                          aria-hidden
                        />
                      </Button>
                    }
                  />
                  <PopoverContent
                    className="w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="e.g. Capellan"
                        value={surnameQuery}
                        onValueChange={setSurnameQuery}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {lookupPending
                            ? "Searching patient records…"
                            : lookupError
                              ? lookupError
                              : surnameQuery.trim().length < SURNAME_MIN_CHARS
                                ? "Type a surname letter to search."
                                : "No matching surnames in patient records."}
                        </CommandEmpty>
                        <CommandGroup heading="Patient records">
                          {matches.map((patient) => {
                            const id = patientCampusId(patient)
                            return (
                              <CommandItem
                                key={patient.id}
                                value={`${patient.lastName} ${patient.firstName} ${id ?? ""}`}
                                onSelect={() => selectPatient(patient)}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  <span className="font-medium">
                                    {patient.lastName}
                                  </span>
                                  <span className="text-muted-foreground">
                                    , {patient.firstName}
                                    {patient.middleName
                                      ? ` ${patient.middleName}`
                                      : ""}
                                    {" · "}
                                    {patientTypeLabel(patient.patientType)}
                                    {id ? ` · ${id}` : ""}
                                  </span>
                                </span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <FieldDescription className="text-xs leading-relaxed">
                {selectedPatient
                  ? "Matched from patient records. Clear to search again."
                  : "Searches last name in patient records. Visitors without a record can enter a name below."}
              </FieldDescription>
            </Field>

            {showManualName ? (
              <Field className="gap-1.5" data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="walkin-name">Full name</FieldLabel>
                <Input
                  id="walkin-name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter full name for a visitor"
                  disabled={pending}
                  autoComplete="name"
                />
              </Field>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
              <Field className="gap-1.5">
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
                        (WALK_IN_PATIENT_TYPES as readonly string[]).includes(
                          value
                        )
                        ? (value as WalkInPatientType)
                        : ""
                    )
                  }}
                  disabled={pending || Boolean(selectedPatient)}
                >
                  <SelectTrigger id="walkin-patient-type" className="w-full">
                    <SelectValue placeholder="Select type" />
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

              <Field className="gap-1.5">
                <FieldLabel htmlFor="walkin-campus-display">
                  {CAMPUS_ID_LABEL}
                </FieldLabel>
                <Input
                  id="walkin-campus-display"
                  value={campusId}
                  readOnly
                  placeholder={
                    selectedPatient ? "No ID on record" : "Filled from record"
                  }
                  disabled
                  className="bg-muted/40"
                />
              </Field>
            </div>

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

            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors sm:px-4 sm:py-3.5",
                emergency
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border bg-muted/20"
              )}
            >
              <IconAlertTriangle
                className={cn(
                  "mt-0.5 size-4 shrink-0 self-start",
                  emergency ? "text-destructive" : "text-muted-foreground"
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Emergency</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Jump this patient to the front of the nurse queue and flag the
                  visit as Emergency.
                </p>
              </div>
              <Switch
                checked={emergency}
                onCheckedChange={setEmergency}
                disabled={pending}
                aria-label="Mark as emergency walk-in"
                className="shrink-0"
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </FieldGroup>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/10 px-5 py-3.5 sm:justify-stretch sm:px-6 sm:py-4">
            <Button
              type="submit"
              disabled={pending || lookupPending}
              variant={emergency ? "destructive" : "default"}
              className="w-full"
            >
              {pending
                ? "Registering…"
                : emergency
                  ? "Register emergency to nurse queue"
                  : "Register to nurse queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
