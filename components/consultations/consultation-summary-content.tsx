"use client"

import {
  formatBloodPressure,
  formatVitalsLine,
  hasRecordedVitals,
} from "@/components/queue/vitals-strip"
import { Badge } from "@/components/ui/badge"
import { consultationStatusLabel } from "@/types/consultation"
import type { Consultation } from "@/types/consultation"
import type { QueueVitals } from "@/lib/health/types"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border/60 py-2 last:border-b-0">
      <dt className="w-36 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-foreground">{value || "—"}</dd>
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
    result.weightKg != null
  return hasAny ? result : null
}

export function ConsultationSummaryContent({
  visit,
  ticketVitals,
  patientName,
  hideStatusBadge = false,
}: {
  visit: Consultation
  ticketVitals?: QueueVitals | null
  patientName?: string | null
  hideStatusBadge?: boolean
}) {
  const vitals = ticketVitals ?? vitalsFromRecord(visit.vitals)
  const providerLabel = visit.providerName
    ? `${visit.providerName}${visit.providerRole ? ` (${visit.providerRole})` : ""}`
    : visit.station

  const displayNotes =
    visit.notes?.replace(/dental_appointment_id=[0-9a-f-]{36}/i, "").trim() ||
    null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {!hideStatusBadge ? (
          <Badge variant="outline">{consultationStatusLabel(visit.status)}</Badge>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {visit.consultationDate.slice(0, 16).replace("T", " ")}
        </p>
        {patientName ? (
          <p className="text-sm font-medium text-foreground">{patientName}</p>
        ) : null}
      </div>

      <section>
        <p className="mb-2 text-sm font-semibold">Consultation summary</p>
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
          {displayNotes ? <Row label="Notes" value={displayNotes} /> : null}
        </dl>
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold">Vital records</p>
        {vitals && hasRecordedVitals(vitals) ? (
          <dl>
            <Row label="Blood pressure" value={formatBloodPressure(vitals)} />
            <Row
              label="Heart rate"
              value={vitals.heartRate != null ? String(vitals.heartRate) : null}
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
            <Row label="Summary" value={formatVitalsLine(vitals)} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No vitals recorded for this visit.
          </p>
        )}
      </section>
    </div>
  )
}

export function consultationHistoryPreview(visit: Consultation): string[] {
  const lines: string[] = []
  if (visit.chiefComplaint?.trim()) {
    lines.push(`Chief complaint: ${visit.chiefComplaint.trim()}`)
  }
  if (visit.symptoms?.trim() && visit.symptoms.trim() !== visit.chiefComplaint?.trim()) {
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
