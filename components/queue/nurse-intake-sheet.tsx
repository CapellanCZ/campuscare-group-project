"use client"

import { useEffect, useState, useTransition } from "react"
import { queueToasts } from "@/lib/feedback/toast-messages"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconDental,
  IconHistory,
  IconStethoscope,
} from "@tabler/icons-react"

import { SelectWithOtherField } from "@/components/shared/select-with-other-field"
import { VitalNumberInput } from "@/components/queue/vital-number-input"
import { VitalsHistoryDialog } from "@/components/queue/vitals-history-dialog"
import {
  formatVitalsLine,
  hasRecordedVitals,
} from "@/components/queue/vitals-strip"
import {
  actionCompleteNurseIntake,
  actionFetchPatientVitalsHistory,
} from "@/lib/health/queue-server-actions"
import {
  CHIEF_COMPLAINT_OPTIONS,
  OTHER_SELECT_VALUE,
} from "@/lib/health/form-options"
import { stripOtherReasonPrefix } from "@/lib/health/consultation-display"
import type {
  PatientVitalsRecord,
  QueueTicketRow,
  SpecialtyStationId,
} from "@/lib/health/types"
import { ticketLabel } from "@/lib/health/mappers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type NurseIntakeSheetProps = {
  ticket: QueueTicketRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned?: (ticketId: string, toStation: SpecialtyStationId) => void
  /** Roll back local SoT when Supabase intake save fails. */
  onAssignFailed?: (ticketId: string) => void
  /** Reconcile from Supabase after a successful intake write. */
  onAssignSynced?: () => void
}

function toNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function numStr(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "" : String(value)
}

/** Patient-requested specialty from the ticket; nurse can still change it. */
function defaultIntakeStation(ticket: QueueTicketRow): SpecialtyStationId {
  const service = (
    ticket.consultationType ??
    ticket.service ??
    ""
  ).toLowerCase()
  const serviceIsDental =
    service !== "other" &&
    service !== OTHER_SELECT_VALUE &&
    (service.includes("dental") ||
      service.includes("dentist") ||
      service.includes("tooth"))

  if (ticket.providerType === "dentist" || serviceIsDental) {
    return "dentist"
  }
  if (ticket.providerType === "physician") {
    return "physician"
  }
  if (ticket.station === "dentist" || ticket.station === "physician") {
    return ticket.station
  }
  return "physician"
}

function VitalField({
  label,
  htmlFor,
  required,
  className,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-medium text-muted-foreground"
      >
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children}
    </div>
  )
}

export function NurseIntakeSheet({
  ticket,
  open,
  onOpenChange,
  onAssigned,
  onAssignFailed,
  onAssignSynced,
}: NurseIntakeSheetProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [chiefComplaint, setChiefComplaint] = useState("")
  const [bpSystolic, setBpSystolic] = useState("")
  const [bpDiastolic, setBpDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const [temperatureC, setTemperatureC] = useState("")
  const [spo2, setSpo2] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [respiratoryRate, setRespiratoryRate] = useState("")
  const [intakeNotes, setIntakeNotes] = useState("")
  const [toStation, setToStation] = useState<SpecialtyStationId>("physician")
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [latestVitals, setLatestVitals] = useState<PatientVitalsRecord | null>(
    null
  )
  const [historyRecords, setHistoryRecords] = useState<PatientVitalsRecord[]>(
    []
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [visitFormKey, setVisitFormKey] = useState(0)

  useEffect(() => {
    if (!open || !ticket) return
    const complaint = stripOtherReasonPrefix(ticket.chiefComplaint)
    setChiefComplaint(
      !complaint || complaint === OTHER_SELECT_VALUE ? "" : complaint
    )
    // Local source of truth: this visit starts empty; prior vitals stay reference-only.
    setBpSystolic("")
    setBpDiastolic("")
    setHeartRate("")
    setTemperatureC("")
    setSpo2("")
    setHeightCm("")
    setWeightKg("")
    setRespiratoryRate("")
    setIntakeNotes(ticket.intakeNotes ?? "")
    setVisitFormKey((key) => key + 1)
    setToStation(defaultIntakeStation(ticket))
    setError(null)
    setStatusMessage(null)
    setLatestVitals(null)
    setHistoryRecords([])
    setHistoryOpen(false)

    if (!ticket.patientId) return

    let cancelled = false
    void actionFetchPatientVitalsHistory(
      ticket.patientId,
      ticket.ticketId
    ).then((result) => {
      if (cancelled) return
      if (!result.ok) {
        queueToasts.failed(result.error)
        return
      }
      setHistoryRecords(result.data)
      setLatestVitals(result.data[0] ?? null)
    })

    return () => {
      cancelled = true
    }
  }, [open, ticket])

  function reset() {
    setChiefComplaint("")
    setBpSystolic("")
    setBpDiastolic("")
    setHeartRate("")
    setTemperatureC("")
    setSpo2("")
    setHeightCm("")
    setWeightKg("")
    setRespiratoryRate("")
    setIntakeNotes("")
    setToStation("physician")
    setError(null)
    setStatusMessage(null)
    setLatestVitals(null)
    setHistoryRecords([])
    setHistoryOpen(false)
  }

  function applyLatestAsDraft() {
    const source =
      latestVitals?.vitals ??
      (ticket && hasRecordedVitals(ticket.vitals) ? ticket.vitals : null)
    if (!source) return
    setBpSystolic(numStr(source.bpSystolic))
    setBpDiastolic(numStr(source.bpDiastolic))
    setHeartRate(numStr(source.heartRate))
    setTemperatureC(numStr(source.temperatureC))
    setSpo2(numStr(source.spo2))
    setHeightCm(numStr(source.heightCm))
    setWeightKg(numStr(source.weightKg))
    setRespiratoryRate(numStr(source.respiratoryRate))
  }

  function openHistory() {
    setHistoryOpen(true)
    if (!ticket?.patientId || historyRecords.length > 0) return
    setHistoryLoading(true)
    void actionFetchPatientVitalsHistory(
      ticket.patientId,
      ticket.ticketId
    ).then((result) => {
      setHistoryLoading(false)
      if (!result.ok) {
        queueToasts.failed(result.error)
        return
      }
      setHistoryRecords(result.data)
      setLatestVitals(result.data[0] ?? null)
    })
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!ticket) return

    const missing: string[] = []
    if (!toNumber(bpSystolic) || !toNumber(bpDiastolic)) {
      missing.push("Blood Pressure")
    }
    if (!toNumber(heartRate)) missing.push("Heart Rate")
    if (!toNumber(temperatureC)) missing.push("Temperature")
    if (!toNumber(spo2)) missing.push("SpO₂")
    if (missing.length > 0) {
      const message = `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`
      setError(message)
      queueToasts.failed(message)
      return
    }

    setError(null)
    setStatusMessage("Saving vitals…")
    // Local-first: update queue immediately, then sync.
    onAssigned?.(ticket.ticketId, toStation)

    startTransition(async () => {
      const result = await actionCompleteNurseIntake(ticket.ticketId, {
        chiefComplaint,
        bpSystolic: toNumber(bpSystolic),
        bpDiastolic: toNumber(bpDiastolic),
        heartRate: toNumber(heartRate),
        temperatureC: toNumber(temperatureC),
        spo2: toNumber(spo2),
        heightCm: toNumber(heightCm),
        weightKg: toNumber(weightKg),
        respiratoryRate: toNumber(respiratoryRate),
        intakeNotes,
        toStation,
      })

      if (!result.ok) {
        setError(result.error)
        setStatusMessage(null)
        queueToasts.failed(result.error)
        onAssignFailed?.(ticket.ticketId)
        router.refresh()
        return
      }

      queueToasts.intakeDone(ticket.patientName, toStation)
      reset()
      onOpenChange(false)
      onAssignSynced?.()
      router.refresh()
    })
  }

  const latestLine =
    latestVitals && hasRecordedVitals(latestVitals.vitals)
      ? formatVitalsLine(latestVitals.vitals)
      : hasRecordedVitals(
            ticket?.vitals ?? {
              bpSystolic: null,
              bpDiastolic: null,
              heartRate: null,
              temperatureC: null,
              spo2: null,
              heightCm: null,
              weightKg: null,
              respiratoryRate: null,
            }
          )
        ? formatVitalsLine(ticket!.vitals)
        : null

  const isEmergency = ticket?.priority === "urgent"
  const hasLatest = Boolean(latestLine)

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) reset()
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="gap-1.5 border-b px-5 py-4 text-left sm:px-6">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className="leading-none">
                {isEmergency ? "Emergency intake" : "Intake"}
              </DialogTitle>
              {ticket ? (
                <>
                  <span className="font-semibold tabular-nums text-foreground">
                    {ticketLabel(ticket.queueNumber, ticket.ticketCode)}
                  </span>
                  {isEmergency ? (
                    <Badge
                      variant="outline"
                      className="h-5 gap-1 border-destructive/40 bg-destructive/5 px-1.5 text-[10px] text-destructive"
                    >
                      <IconAlertTriangle
                        className="size-3"
                        stroke={1.75}
                        aria-hidden
                      />
                      Emergency
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {ticket.status}
                    </Badge>
                  )}
                </>
              ) : null}
            </div>
            <DialogDescription className="text-xs">
              {ticket
                ? `${ticket.patientName}${ticket.campusId ? ` · ${ticket.campusId}` : ""}`
                : "Record vitals, then send to specialty."}
            </DialogDescription>
          </DialogHeader>

          <form
            key={`intake-${ticket?.ticketId ?? "none"}-${visitFormKey}`}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={onSubmit}
            autoComplete="off"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              <SelectWithOtherField
                key={ticket?.ticketId ?? "intake-closed"}
                id="intake-complaint"
                label="Chief complaint"
                labelClassName="text-[11px]"
                options={CHIEF_COMPLAINT_OPTIONS}
                value={chiefComplaint}
                onValueChange={setChiefComplaint}
                placeholder="Select chief complaint"
                otherPlaceholder="Describe the complaint…"
                preferCustomValueOnly
                disabled={pending}
              />

              <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Prior vitals
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-foreground">
                      {latestLine ?? "None on file for this patient."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {hasLatest ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={pending}
                        onClick={applyLatestAsDraft}
                      >
                        Use as draft
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="size-7"
                      disabled={!ticket?.patientId}
                      aria-label="View all vital records"
                      title="View all records"
                      onClick={openHistory}
                    >
                      <IconHistory
                        className="size-3.5"
                        stroke={1.75}
                        aria-hidden
                      />
                    </Button>
                  </div>
                </div>
              </div>

              <div
                className="space-y-2"
                key={`this-visit-${ticket?.ticketId ?? "closed"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold text-foreground">
                    This visit
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    * required
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5 sm:grid-cols-4">
                  <VitalField
                    label="BP"
                    htmlFor="intake-sys"
                    required
                    className="col-span-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <VitalNumberInput
                        id="intake-sys"
                        aria-label="BP systolic"
                        placeholder="Sys"
                        value={bpSystolic}
                        onValueChange={setBpSystolic}
                        disabled={pending}
                      />
                      <span className="text-muted-foreground" aria-hidden>
                        /
                      </span>
                      <VitalNumberInput
                        id="intake-dia"
                        aria-label="BP diastolic"
                        placeholder="Dia"
                        value={bpDiastolic}
                        onValueChange={setBpDiastolic}
                        disabled={pending}
                      />
                    </div>
                  </VitalField>
                  <VitalField label="HR" htmlFor="intake-hr" required>
                    <VitalNumberInput
                      id="intake-hr"
                      placeholder="bpm"
                      value={heartRate}
                      onValueChange={setHeartRate}
                      disabled={pending}
                    />
                  </VitalField>
                  <VitalField label="Temp °C" htmlFor="intake-temp" required>
                    <VitalNumberInput
                      id="intake-temp"
                      mode="decimal"
                      placeholder="°C"
                      value={temperatureC}
                      onValueChange={setTemperatureC}
                      disabled={pending}
                    />
                  </VitalField>
                  <VitalField label="SpO₂ %" htmlFor="intake-spo2" required>
                    <VitalNumberInput
                      id="intake-spo2"
                      placeholder="%"
                      value={spo2}
                      onValueChange={setSpo2}
                      disabled={pending}
                    />
                  </VitalField>
                  <VitalField label="RR" htmlFor="intake-rr">
                    <VitalNumberInput
                      id="intake-rr"
                      placeholder="rpm"
                      value={respiratoryRate}
                      onValueChange={setRespiratoryRate}
                      disabled={pending}
                    />
                  </VitalField>
                  <VitalField label="Weight kg" htmlFor="intake-weight">
                    <VitalNumberInput
                      id="intake-weight"
                      mode="decimal"
                      placeholder="kg"
                      value={weightKg}
                      onValueChange={setWeightKg}
                      disabled={pending}
                    />
                  </VitalField>
                  <VitalField label="Height cm" htmlFor="intake-height">
                    <VitalNumberInput
                      id="intake-height"
                      mode="decimal"
                      placeholder="cm"
                      value={heightCm}
                      onValueChange={setHeightCm}
                      disabled={pending}
                    />
                  </VitalField>
                </div>
              </div>

              <Field className="gap-1">
                <FieldLabel htmlFor="intake-notes" className="text-[11px]">
                  Notes
                </FieldLabel>
                <Textarea
                  id="intake-notes"
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                  disabled={pending}
                  placeholder="Optional for clinician"
                  className="min-h-14 resize-none"
                />
              </Field>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold text-foreground">
                    Route after intake
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Choose specialty
                  </p>
                </div>
                <div
                  key={`send-to-${ticket?.ticketId ?? "closed"}`}
                  role="radiogroup"
                  aria-label="Specialty station"
                  className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/20 p-1"
                >
                  {(
                    [
                      {
                        value: "physician" as const,
                        label: "Physician",
                        hint: "Medical",
                        Icon: IconStethoscope,
                      },
                      {
                        value: "dentist" as const,
                        label: "Dentist",
                        hint: "Dental",
                        Icon: IconDental,
                      },
                    ] as const
                  ).map(({ value, label, hint, Icon }) => {
                    const selected = toStation === value
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={pending}
                        onClick={() => setToStation(value)}
                        className={cn(
                          "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          "disabled:pointer-events-none disabled:opacity-50",
                          selected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground hover:bg-background/80"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md border",
                            selected
                              ? "border-primary-foreground/25 bg-primary-foreground/10"
                              : "border-border/80 bg-background"
                          )}
                        >
                          <Icon
                            className="size-3.5"
                            stroke={1.75}
                            aria-hidden
                          />
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="block text-sm font-medium">
                            {label}
                          </span>
                          <span
                            className={cn(
                              "block text-[10px]",
                              selected
                                ? "text-primary-foreground/75"
                                : "text-muted-foreground"
                            )}
                          >
                            {hint}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              {statusMessage ? (
                <p role="status" className="text-xs text-muted-foreground">
                  {statusMessage}
                </p>
              ) : null}
            </div>

            <DialogFooter className="mt-auto gap-2 border-t px-5 py-3 sm:flex-row sm:px-6">
              <DialogClose
                render={<Button type="button" size="sm" variant="outline" />}
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={pending || !ticket}
                className="sm:flex-1"
              >
                {pending
                  ? "Sending…"
                  : `Send to ${toStation === "dentist" ? "dentist" : "physician"}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <VitalsHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        patientName={ticket?.patientName}
        records={historyRecords}
        loading={historyLoading}
      />
    </>
  )
}
