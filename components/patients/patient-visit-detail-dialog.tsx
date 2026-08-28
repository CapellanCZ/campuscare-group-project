"use client"

import { useEffect, useState } from "react"

import { ConsultationSummaryContent } from "@/components/consultations/consultation-summary-content"
import { MedicalRecordPreview } from "@/components/patients/medical-record-preview"
import { fetchConsultationVisitDetailAction } from "@/features/patients/actions"
import { consultationToasts } from "@/lib/feedback/toast-messages"
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
import { patientFullName, type PatientRecord } from "@/types/patientRecord"

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
        consultationToasts.failed(result.error)
        return
      }
      setVisit(result.data.consultation)
      setTicketVitals(result.data.ticketVitals)
    })
    return () => {
      cancelled = true
    }
  }, [open, consultation])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,760px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>Visit records</DialogTitle>
          <DialogDescription>
            {patient
              ? `Consultation summary · ${patientFullName(patient)}`
              : "Consultation summary"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading && !visit ? (
            <Skeleton className="h-40 w-full" />
          ) : visit ? (
            <>
              <ConsultationSummaryContent
                visit={visit}
                ticketVitals={ticketVitals}
              />

              {patient ? (
                <section>
                  <p className="mb-3 text-sm font-semibold">Medical record</p>
                  <MedicalRecordPreview patient={patient} />
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
