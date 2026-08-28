"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { PatientVisitDetailDialog } from "@/components/patients/patient-visit-detail-dialog"
import { fetchPatientConsultationHistoryAction } from "@/features/patients/actions"
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
import type { Consultation } from "@/types/consultation"
import {
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"

export function PatientHistorySheet({
  patient,
  open,
  onOpenChange,
  stationFilter,
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set (e.g. dentist), only show consultations for that station. */
  stationFilter?: "dentist" | "physician" | "nurse" | "all"
}) {
  const [rows, setRows] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Consultation | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const dentalOnly = stationFilter === "dentist"

  useEffect(() => {
    if (!open || !patient) return
    let cancelled = false
    setLoading(true)
    void fetchPatientConsultationHistoryAction(patient.id).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        toast.error(result.error)
        setRows([])
        return
      }
      const next =
        stationFilter && stationFilter !== "all"
          ? result.data.filter((row) => row.station === stationFilter)
          : result.data
      setRows(next)
    })
    return () => {
      cancelled = true
    }
  }, [open, patient, stationFilter])

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) {
            setDetailOpen(false)
            setSelected(null)
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>
              {dentalOnly ? "Dental history" : "Consultation history"}
            </DialogTitle>
            <DialogDescription>
              {patient
                ? dentalOnly
                  ? `Previous dental consultations for ${patientFullName(patient)}`
                  : `Consultations for ${patientFullName(patient)}. Select one to view that visit.`
                : "Patient consultations"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4 pb-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))
            ) : rows.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                {dentalOnly
                  ? "No dental consultations linked to this patient yet."
                  : "No consultations linked to this patient yet."}
              </p>
            ) : (
              rows.map((row) => {
                const chartMatch = row.notes?.match(
                  /dental_appointment_id=([0-9a-f-]{36})/i
                )
                const chartHref = chartMatch
                  ? `/dentist/consultation/${chartMatch[1]}`
                  : null

                return (
                  <Button
                    key={row.id}
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
                      <Badge variant="outline">{row.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.consultationDate.slice(0, 16).replace("T", " ")}
                      {row.providerName
                        ? ` · ${dentalOnly ? "Dentist" : "Provider"}: ${row.providerName}`
                        : row.station
                          ? ` · ${row.station}`
                          : ""}
                    </p>
                    {row.treatment ? (
                      <p className="text-sm text-muted-foreground">
                        Treatment: {row.treatment}
                      </p>
                    ) : null}
                    {chartHref && dentalOnly ? (
                      <a
                        href={chartHref}
                        className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Open dental patient chart
                      </a>
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
    </>
  )
}
