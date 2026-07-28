"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { fetchPatientConsultationHistoryAction } from "@/features/patients/actions"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Consultation } from "@/types/consultation"
import {
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"

export function PatientHistorySheet({
  patient,
  open,
  onOpenChange,
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [rows, setRows] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)

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
      setRows(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [open, patient])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Consultation history</SheetTitle>
          <SheetDescription>
            {patient
              ? `Consultations for ${patientFullName(patient)}`
              : "Patient consultations"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No consultations linked to this patient yet.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="space-y-1 border-b pb-3 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {row.chiefComplaint || "Consultation"}
                  </p>
                  <Badge variant="outline">{row.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.consultationDate.slice(0, 16).replace("T", " ")}
                  {row.station ? ` · ${row.station}` : ""}
                  {row.providerName ? ` · ${row.providerName}` : ""}
                </p>
                {row.diagnosis ? (
                  <p className="text-sm text-muted-foreground">
                    Dx: {row.diagnosis}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
