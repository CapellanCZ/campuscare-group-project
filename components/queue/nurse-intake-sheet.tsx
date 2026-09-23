"use client"

import { useEffect, useState, useTransition } from "react"
import { appToast } from "@/lib/feedback/app-toast"
import { queueToasts } from "@/lib/feedback/toast-messages"
import { useRouter } from "next/navigation"

import { SelectWithOtherField } from "@/components/shared/select-with-other-field"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const THIS_VISIT_PLACEHOLDERS = {
  bpSystolic: "Enter systolic BP",
  bpDiastolic: "Enter diastolic BP",
  heartRate: "Enter heart rate",
  temperature: "Enter temperature",
  spo2: "Enter SpO₂",
  height: "Enter height",
  weight: "Enter weight",
} as const

type NurseIntakeSheetProps = {
  ticket: QueueTicketRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned?: (ticketId: string, toStation: SpecialtyStationId) => void
}

function toNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/** Patient-requested specialty from the ticket; nurse can still change it. */
function defaultIntakeStation(ticket: QueueTicketRow): SpecialtyStationId {
  if (
    ticket.providerType === "dentist" ||
    ticket.providerType === "physician"
  ) {
    return ticket.providerType
  }
  const service = (
    ticket.consultationType ??
    ticket.service ??
    ""
  ).toLowerCase()
  if (
    service.includes("dental") ||
    service.includes("dentist") ||
    service.includes("tooth")
  ) {
    return "dentist"
  }
  if (ticket.station === "dentist" || ticket.station === "physician") {
    return ticket.station
  }
  return "physician"
}

function VitalField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor: string
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
    const complaint = (ticket.chiefComplaint ?? "").trim()
    setChiefComplaint(
      !complaint || complaint === OTHER_SELECT_VALUE ? "" : complaint
    )
    // This Visit vitals start empty — latest values are reference-only below.
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
        router.refresh()
        return
      }

      const destination =
        toStation === "dentist" ? "Dentist queue" : "Physician queue"
      appToast.success({
        title: result.message ?? `Sent to ${destination}`,
        description: "Patient vitals have been recorded and the queue updated.",
      })
      reset()
      onOpenChange(false)
      router.refresh()
    })
  }

  const latestLine =
    latestVitals && hasRecordedVitals(latestVitals.vitals)
      ? formatVitalsLine(latestVitals.vitals)
      : hasRecordedVitals(ticket?.vitals ?? {
          bpSystolic: null,
          bpDiastolic: null,
          heartRate: null,
          temperatureC: null,
          spo2: null,
          heightCm: null,
          weightKg: null,
          respiratoryRate: null,
        })
        ? formatVitalsLine(ticket!.vitals)
        : null

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) reset()
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,760px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="gap-1 border-b px-6 py-4 text-left">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle className="leading-none">Intake</DialogTitle>
              {ticket ? (
                <>
                  <span className="font-semibold tabular-nums text-foreground">
                    {ticketLabel(ticket.queueNumber, ticket.ticketCode)}
                  </span>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {ticket.status}
                  </Badge>
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
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
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
                disabled={pending}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Latest vital signs
                  </p>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    disabled={!ticket?.patientId}
                    onClick={openHistory}
                  >
                    View All Records
                  </Button>
                </div>
                <p className="text-sm text-foreground">
                  {latestLine ?? "No prior vitals on record."}
                </p>
              </div>

              <div className="space-y-2" key={`this-visit-${ticket?.ticketId ?? "closed"}`}>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  This visit
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <VitalField
                    label="BP *"
                    htmlFor="intake-sys"
                    className="col-span-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <Input
                        id="intake-sys"
                        inputMode="numeric"
                        aria-label="BP systolic"
                        placeholder={THIS_VISIT_PLACEHOLDERS.bpSystolic}
                        autoComplete="off"
                        value={bpSystolic}
                        onChange={(e) => setBpSystolic(e.target.value)}
                        disabled={pending}
                        className="h-9"
                      />
                      <span className="text-muted-foreground" aria-hidden>
                        /
                      </span>
                      <Input
                        id="intake-dia"
                        inputMode="numeric"
                        aria-label="BP diastolic"
                        placeholder={THIS_VISIT_PLACEHOLDERS.bpDiastolic}
                        autoComplete="off"
                        value={bpDiastolic}
                        onChange={(e) => setBpDiastolic(e.target.value)}
                        disabled={pending}
                        className="h-9"
                      />
                    </div>
                  </VitalField>
                  <VitalField label="HR *" htmlFor="intake-hr">
                    <Input
                      id="intake-hr"
                      inputMode="numeric"
                      placeholder={THIS_VISIT_PLACEHOLDERS.heartRate}
                      autoComplete="off"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      disabled={pending}
                      className="h-9"
                    />
                  </VitalField>
                  <VitalField label="Temp °C *" htmlFor="intake-temp">
                    <Input
                      id="intake-temp"
                      inputMode="decimal"
                      placeholder={THIS_VISIT_PLACEHOLDERS.temperature}
                      autoComplete="off"
                      value={temperatureC}
                      onChange={(e) => setTemperatureC(e.target.value)}
                      disabled={pending}
                      className="h-9"
                    />
                  </VitalField>
                  <VitalField label="Weight kg" htmlFor="intake-weight">
                    <Input
                      id="intake-weight"
                      inputMode="decimal"
                      placeholder={THIS_VISIT_PLACEHOLDERS.weight}
                      autoComplete="off"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      disabled={pending}
                      className="h-9"
                    />
                  </VitalField>
                  <VitalField label="Height cm" htmlFor="intake-height">
                    <Input
                      id="intake-height"
                      inputMode="decimal"
                      placeholder={THIS_VISIT_PLACEHOLDERS.height}
                      autoComplete="off"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      disabled={pending}
                      className="h-9"
                    />
                  </VitalField>
                  <VitalField label="RR" htmlFor="intake-rr">
                    <Input
                      id="intake-rr"
                      inputMode="numeric"
                      placeholder="Enter respiratory rate"
                      autoComplete="off"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      disabled={pending}
                      className="h-9"
                    />
                  </VitalField>
                  <VitalField label="SpO₂ % *" htmlFor="intake-spo2">
                    <Input
                      id="intake-spo2"
                      inputMode="numeric"
                      placeholder={THIS_VISIT_PLACEHOLDERS.spo2}
                      autoComplete="off"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      disabled={pending}
                      className="h-9"
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
                  className="min-h-16"
                />
              </Field>

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Send to
                </p>
                <div
                  role="radiogroup"
                  aria-label="Specialty station"
                  className="grid grid-cols-2 gap-1.5"
                >
                  {(
                    [
                      ["physician", "Physician"],
                      ["dentist", "Dentist"],
                    ] as const
                  ).map(([value, label]) => {
                    const selected = toStation === value
                    return (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        aria-checked={selected}
                        role="radio"
                        disabled={pending}
                        onClick={() => setToStation(value)}
                      >
                        {label}
                      </Button>
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

            <DialogFooter className="mt-auto gap-2 border-t px-6 py-3 sm:flex-row">
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
