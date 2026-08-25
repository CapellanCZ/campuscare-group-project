"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  formatBloodPressure,
  formatVitalsLine,
  hasRecordedVitals,
} from "@/components/queue/vitals-strip"
import { fetchConsultationVisitDetailAction } from "@/features/patients/actions"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { QueueVitals } from "@/lib/health/types"
import type { Consultation } from "@/types/consultation"
import {
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border/60 py-2 last:border-b-0">
      <dt className="w-36 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-foreground">
        {value || "—"}
      </dd>
    </div>
  )
}

function vitalsFromRecord(value: Record<string, unknown> | QueueVitals | null): QueueVitals | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const num = (key: string) => {
    const raw = v[key]
    if (raw == null || raw === "") return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
  return {
    bpSystolic: num("bpSystolic") ?? num("bp_systolic"),
    bpDiastolic: num("bpDiastolic") ?? num("bp_diastolic"),
    heartRate: num("heartRate") ?? num("heart_rate"),
    temperatureC: num("temperatureC") ?? num("temperature_c"),
    spo2: num("spo2"),
    heightCm: num("heightCm") ?? num("height_cm"),
    weightKg: num("weightKg") ?? num("weight_kg"),
    respiratoryRate: num("respiratoryRate") ?? num("respiratory_rate"),
  }
}

export function PatientVisitDetailDialog({
  consultation,
  patient,
  open,
  onOpenChange,
}: {
  consultation: Consultation | null
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [ticketVitals, setTicketVitals] = useState<QueueVitals | null>(null)
  const [visit, setVisit] = useState<Consultation | null>(consultation)

  useEffect(() => {
    if (!open || !consultation) {
      setVisit(null)
      setTicketVitals(null)
      return
    }
    setVisit(consultation)
    setTicketVitals(null)
    let cancelled = false
    setLoading(true)
    void fetchConsultationVisitDetailAction(consultation.id).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setVisit(result.data.consultation)
      setTicketVitals(result.data.ticketVitals)
    })
    return () => {
      cancelled = true
    }
  }, [open, consultation])

  const vitals =
    ticketVitals ??
    (visit ? vitalsFromRecord(visit.vitals) : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,760px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>Visit records</DialogTitle>
          <DialogDescription>
            {patient
              ? `Records for this consultation · ${patientFullName(patient)}`
              : "Consultation visit detail"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading && !visit ? (
            <Skeleton className="h-40 w-full" />
          ) : visit ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{visit.status}</Badge>
                <p className="text-sm text-muted-foreground">
                  {visit.consultationDate.slice(0, 16).replace("T", " ")}
                </p>
              </div>

              <section>
                <p className="mb-2 text-sm font-semibold">Consultation</p>
                <dl>
                  <Row
                    label="Chief complaint"
                    value={visit.chiefComplaint}
                  />
                  <Row label="Symptoms" value={visit.symptoms} />
                  <Row label="Assessment" value={visit.assessment} />
                  <Row label="Diagnosis" value={visit.diagnosis} />
                  <Row label="Treatment" value={visit.treatment} />
                  <Row label="Prescription" value={visit.prescription} />
                  <Row
                    label="Provider"
                    value={
                      visit.providerName
                        ? `${visit.providerName}${visit.providerRole ? ` (${visit.providerRole})` : ""}`
                        : visit.station
                    }
                  />
                  <Row label="Notes" value={visit.notes} />
                </dl>
              </section>

              <section>
                <p className="mb-2 text-sm font-semibold">Vital records</p>
                {vitals && hasRecordedVitals(vitals) ? (
                  <dl>
                    <Row
                      label="Blood pressure"
                      value={formatBloodPressure(vitals)}
                    />
                    <Row
                      label="Heart rate"
                      value={
                        vitals.heartRate != null
                          ? String(vitals.heartRate)
                          : null
                      }
                    />
                    <Row
                      label="Temperature"
                      value={
                        vitals.temperatureC != null
                          ? `${vitals.temperatureC}°C`
                          : null
                      }
                    />
                    <Row
                      label="SpO₂"
                      value={
                        vitals.spo2 != null ? `${vitals.spo2}%` : null
                      }
                    />
                    <Row
                      label="Height"
                      value={
                        vitals.heightCm != null
                          ? `${vitals.heightCm} cm`
                          : null
                      }
                    />
                    <Row
                      label="Weight"
                      value={
                        vitals.weightKg != null
                          ? `${vitals.weightKg} kg`
                          : null
                      }
                    />
                    <Row
                      label="Respiratory rate"
                      value={
                        vitals.respiratoryRate != null
                          ? String(vitals.respiratoryRate)
                          : null
                      }
                    />
                    <Row label="Summary" value={formatVitalsLine(vitals)} />
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No vitals recorded for this visit.
                  </p>
                )}
              </section>

              {patient ? (
                <section>
                  <p className="mb-2 text-sm font-semibold">
                    Medical record (on file)
                  </p>
                  <dl>
                    <Row
                      label="Previous illness / surgery"
                      value={
                        patient.medicalHistory.previousIllnessOrSurgery || null
                      }
                    />
                    <Row
                      label="Allergies flagged"
                      value={
                        patient.medicalHistory.allergy ? "Yes" : "No"
                      }
                    />
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Chart fields above are the patient&apos;s current medical
                    record; consultation notes are specific to this visit.
                  </p>
                </section>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a consultation to view its records.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
