"use client"

import { useEffect, useState } from "react"

import { DocumentPreviewDialog } from "@/components/medical-documents/document-preview-dialog"
import {
  certificateToDocument,
  documentTypeLabel,
} from "@/components/medical-documents/document-print-view"
import { documentStatusLabel } from "@/features/medical-documents/lib/document-status"
import {
  getCachedPatientHistory,
  loadPatientHistoryBundle,
  type PatientHistoryEntry,
} from "@/features/patients/lib/prefetch-patient-history"
import type { ClinicalRecordScope } from "@/lib/clinical/record-scope"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { appToast } from "@/lib/feedback/app-toast"
import type { Consultation } from "@/types/consultation"
import { consultationStatusLabel } from "@/types/consultation"
import type { MedicalDocument } from "@/types/medicalDocument"
import {
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"
import { PatientVisitDetailDialog } from "@/components/patients/patient-visit-detail-dialog"
import { DentalChartPreviewDialog } from "@/components/patients/dental-chart-preview-dialog"
import { consultationHistoryPreview } from "@/components/consultations/consultation-summary-content"

function formatHistoryDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed))
}

export function PatientHistorySheet({
  patient,
  open,
  onOpenChange,
  stationFilter,
  documentScope = "all",
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  stationFilter?: "dentist" | "physician" | "nurse" | "all"
  documentScope?: ClinicalRecordScope
}) {
  const station = stationFilter ?? "all"
  const cached =
    patient != null
      ? getCachedPatientHistory(patient, station, documentScope)
      : null
  const [entries, setEntries] = useState<PatientHistoryEntry[]>(
    () => cached?.entries ?? []
  )
  const [loading, setLoading] = useState(() => !cached)
  const [selected, setSelected] = useState<Consultation | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [preview, setPreview] = useState<MedicalDocument | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [chartPreviewId, setChartPreviewId] = useState<string | null>(null)
  const [chartPreviewOpen, setChartPreviewOpen] = useState(false)
  const dentalOnly = stationFilter === "dentist"

  useEffect(() => {
    if (!open || !patient) return
    let cancelled = false
    const hit = getCachedPatientHistory(patient, station, documentScope)
    if (hit) {
      setEntries(hit.entries)
      setLoading(false)
    } else {
      setLoading(true)
    }

    void loadPatientHistoryBundle(patient, station, documentScope)
      .then((bundle) => {
        if (cancelled) return
        setEntries(bundle.entries)
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoading(false)
        if (!hit) setEntries([])
        appToast.error({
          title: "Unable to Load History",
          description:
            error instanceof Error
              ? error.message
              : "Could not load patient history.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [documentScope, open, patient, station])

  const showSkeleton = loading && entries.length === 0

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) {
            setDetailOpen(false)
            setSelected(null)
            setPreviewOpen(false)
            setPreview(null)
            setChartPreviewOpen(false)
            setChartPreviewId(null)
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>Patient history</DialogTitle>
            <DialogDescription>
              {patient
                ? `Consultations and issued reports for ${patientFullName(patient)}.`
                : "Consultations and issued reports."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4 pb-6">
            {showSkeleton ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))
            ) : entries.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                No consultations or reports linked to this patient yet.
              </p>
            ) : (
              entries.map((entry) => {
                if (entry.kind === "report") {
                  const row = entry.row
                  return (
                    <Button
                      key={`report-${row.id}`}
                      type="button"
                      variant="ghost"
                      className="h-auto w-full flex-col items-stretch gap-1 rounded-xl px-3 py-3 text-left whitespace-normal"
                      onClick={() => {
                        setPreview(certificateToDocument(row))
                        setPreviewOpen(true)
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">
                          {documentTypeLabel(certificateToDocument(row))}
                        </p>
                        <Badge variant="secondary">Report</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatHistoryDate(entry.date)}
                        {row.certificateNumber
                          ? ` · ${row.certificateNumber}`
                          : ""}
                        {row.status
                          ? ` · ${documentStatusLabel(row.status)}`
                          : ""}
                      </p>
                    </Button>
                  )
                }

                const row = entry.row
                const chartMatch = row.notes?.match(
                  /dental_appointment_id=([0-9a-f-]{36})/i
                )
                const chartAppointmentId = chartMatch?.[1] ?? null
                const summaryLines = consultationHistoryPreview(row)

                return (
                  <Button
                    key={`consultation-${row.id}`}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full flex-col items-stretch gap-1 rounded-xl px-3 py-3 text-left whitespace-normal"
                    onClick={() => {
                      setSelected(row)
                      setDetailOpen(true)
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        {row.diagnosis || row.chiefComplaint || "Consultation"}
                      </p>
                      <Badge variant="outline">
                        {consultationStatusLabel(row.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatHistoryDate(entry.date)}
                      {row.providerName
                        ? ` · ${dentalOnly ? "Dentist" : "Provider"}: ${row.providerName}`
                        : row.station
                          ? ` · ${row.station}`
                          : ""}
                    </p>
                    {summaryLines.length > 0 ? (
                      <div className="space-y-0.5 pt-1">
                        {summaryLines.map((line) => (
                          <p
                            key={line}
                            className="text-sm text-muted-foreground line-clamp-2"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {chartAppointmentId && dentalOnly ? (
                      <button
                        type="button"
                        className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation()
                          setChartPreviewId(chartAppointmentId)
                          setChartPreviewOpen(true)
                        }}
                      >
                        Preview dental patient chart
                      </button>
                    ) : null}
                  </Button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PatientVisitDetailDialog
        consultation={selected}
        patient={patient}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <DocumentPreviewDialog
        document={preview}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      <DentalChartPreviewDialog
        appointmentId={chartPreviewId}
        open={chartPreviewOpen}
        onOpenChange={setChartPreviewOpen}
      />
    </>
  )
}
