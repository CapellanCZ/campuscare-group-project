"use client"

import {
  formatBloodPressure,
  formatVitalsLine,
  hasRecordedVitals,
} from "@/components/queue/vitals-strip"
import { Badge } from "@/components/ui/badge"
import { formatRequestDateTime } from "@/features/requests/lib/format"
import { consultationStatusLabel } from "@/types/consultation"
import type { Consultation } from "@/types/consultation"
import type { QueueVitals } from "@/lib/health/types"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const display =
    value == null || value === "" ? "—" : value
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-b border-border/50 py-2.5 last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground break-words">{display}</dd>
    </div>
  )
}

export function vitalsFromRecord(
  value: Record<string, unknown> | QueueVitals | null
): QueueVitals | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const num = (key: string) => {
    const raw = v[key]
    if (raw == null || raw === "") return null
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
    const match = String(raw).replace(/,/g, "").match(/-?\d+(\.\d+)?/)
    if (!match) return null
    const n = Number(match[0])
    return Number.isFinite(n) ? n : null
  }

  let bpSystolic = num("bpSystolic") ?? num("bp_systolic")
  let bpDiastolic = num("bpDiastolic") ?? num("bp_diastolic")
  const bloodPressure =
    typeof v.bloodPressure === "string" ? v.bloodPressure.trim() : ""
  if ((bpSystolic == null || bpDiastolic == null) && bloodPressure) {
    const match = bloodPressure.match(/(\d+)\s*\/\s*(\d+)/)
    if (match) {
      bpSystolic = Number(match[1])
      bpDiastolic = Number(match[2])
    }
  }

  const heartRate =
    num("heartRate") ?? num("heart_rate") ?? num("pulseRate")
  const temperatureC =
    num("temperatureC") ?? num("temperature_c") ?? num("temperature")
  const spo2 = num("spo2") ?? num("o2")
  const heightCm = num("heightCm") ?? num("height_cm") ?? num("height")
  const weightKg = num("weightKg") ?? num("weight_kg") ?? num("weight")

  const result: QueueVitals = {
    bpSystolic: Number.isFinite(bpSystolic) ? bpSystolic : null,
    bpDiastolic: Number.isFinite(bpDiastolic) ? bpDiastolic : null,
    heartRate: Number.isFinite(heartRate) ? heartRate : null,
    temperatureC: Number.isFinite(temperatureC) ? temperatureC : null,
    spo2: Number.isFinite(spo2) ? spo2 : null,
    heightCm: Number.isFinite(heightCm) ? heightCm : null,
    weightKg: Number.isFinite(weightKg) ? weightKg : null,
    respiratoryRate: num("respiratoryRate") ?? num("respiratory_rate"),
  }

  const hasAny =
    result.bpSystolic != null ||
    result.heartRate != null ||
    result.temperatureC != null ||
    result.spo2 != null ||
    result.heightCm != null ||
    result.weightKg != null ||
    result.respiratoryRate != null
  return hasAny ? result : null
}

function VitalsRows({
  vitals,
  showSummary,
}: {
  vitals: QueueVitals
  showSummary?: boolean
}) {
  return (
    <dl>
      <Row label="Blood pressure" value={formatBloodPressure(vitals)} />
      <Row
        label="Heart rate"
        value={vitals.heartRate != null ? `${vitals.heartRate} bpm` : null}
      />
      <Row
        label="Temperature"
        value={
          vitals.temperatureC != null ? `${vitals.temperatureC}°C` : null
        }
      />
      <Row
        label="SpO₂"
        value={vitals.spo2 != null ? `${vitals.spo2}%` : null}
      />
      <Row
        label="Respiratory rate"
        value={
          vitals.respiratoryRate != null
            ? `${vitals.respiratoryRate} /min`
            : null
        }
      />
      <Row
        label="Height"
        value={vitals.heightCm != null ? `${vitals.heightCm} cm` : null}
      />
      <Row
        label="Weight"
        value={vitals.weightKg != null ? `${vitals.weightKg} kg` : null}
      />
      {showSummary ? (
        <Row label="Summary" value={formatVitalsLine(vitals)} />
      ) : null}
    </dl>
  )
}

export function ConsultationSummaryContent({
  visit,
  ticketVitals,
  patientName,
  hideStatusBadge = false,
  /** Nurse handoff view — vitals + complaint, not a completed consult chart. */
  variant = "full",
}: {
  visit: Consultation
  ticketVitals?: QueueVitals | null
  patientName?: string | null
  hideStatusBadge?: boolean
  variant?: "full" | "intake"
}) {
  const vitals = ticketVitals ?? vitalsFromRecord(visit.vitals)
  const providerLabel = visit.providerName
    ? `${visit.providerName}${visit.providerRole ? ` (${visit.providerRole})` : ""}`
    : visit.station
  const isIntake = variant === "intake"

  const displayNotes =
    visit.notes?.replace(/dental_appointment_id=[0-9a-f-]{36}/i, "").trim() ||
    null

  const stationLabel =
    visit.station === "dentist"
      ? "Dentist"
      : visit.station === "physician"
        ? "Physician"
        : visit.station

  const when = formatRequestDateTime(visit.consultationDate)

  return (
    <div className="space-y-6">
      <header className="space-y-3 border-b border-border/60 pb-4">
        {patientName ? (
          <h3 className="text-base font-semibold tracking-tight text-foreground text-pretty">
            {patientName}
          </h3>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {!hideStatusBadge ? (
            <Badge variant="outline" className="w-fit font-medium">
              {isIntake
                ? `Sent to ${stationLabel}`
                : consultationStatusLabel(visit.status)}
            </Badge>
          ) : null}
          <span
            className="text-xs text-muted-foreground tabular-nums"
            title={visit.consultationDate}
          >
            {when}
          </span>
        </div>
      </header>

      {isIntake ? (
        <>
          <section>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Intake
            </p>
            <dl>
              <Row label="Chief complaint" value={visit.chiefComplaint} />
              <Row label="Sent to" value={stationLabel} />
              <Row label="Recorded by" value={providerLabel} />
              <Row label="Notes" value={displayNotes} />
            </dl>
          </section>

          <section>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Vitals
            </p>
            {vitals && hasRecordedVitals(vitals) ? (
              <VitalsRows vitals={vitals} />
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                No vitals recorded for this intake.
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          <section>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Consultation summary
            </p>
            <dl>
              <Row label="Chief complaint" value={visit.chiefComplaint} />
              <Row label="Symptoms" value={visit.symptoms} />
              <Row label="Assessment / Diagnosis" value={visit.diagnosis} />
              <Row label="Clinical notes" value={visit.assessment} />
              <Row label="Treatment" value={visit.treatment} />
              <Row label="Prescription" value={visit.prescription} />
              {visit.followUpDate ? (
                <Row label="Follow-up" value={visit.followUpDate.slice(0, 10)} />
              ) : null}
              <Row label="Provider" value={providerLabel} />
              <Row label="Notes" value={displayNotes} />
            </dl>
          </section>

          <section>
            <p className="mb-1 text-sm font-semibold text-foreground">
              Vital records
            </p>
            {vitals && hasRecordedVitals(vitals) ? (
              <VitalsRows vitals={vitals} showSummary />
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                No vitals recorded for this visit.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export function consultationHistoryPreview(visit: Consultation): string[] {
  const lines: string[] = []
  if (visit.chiefComplaint?.trim()) {
    lines.push(`Chief complaint: ${visit.chiefComplaint.trim()}`)
  }
  if (
    visit.symptoms?.trim() &&
    visit.symptoms.trim() !== visit.chiefComplaint?.trim()
  ) {
    lines.push(`Symptoms: ${visit.symptoms.trim()}`)
  }
  if (visit.diagnosis?.trim()) {
    lines.push(`Diagnosis: ${visit.diagnosis.trim()}`)
  }
  if (visit.treatment?.trim()) {
    lines.push(`Treatment: ${visit.treatment.trim()}`)
  }
  if (visit.prescription?.trim()) {
    lines.push(`Prescription: ${visit.prescription.trim()}`)
  }
  return lines.slice(0, 4)
}
