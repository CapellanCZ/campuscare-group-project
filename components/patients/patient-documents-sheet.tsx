"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { fetchPatientDocumentsAction } from "@/features/patients/actions"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { MedicalCertificate } from "@/types/medicalCertificate"
import { patientFullName, type PatientRecord } from "@/types/patientRecord"

function formatDate(value: string | null) {
  if (!value) return "—"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed))
}

export function PatientDocumentsSheet({
  patient,
  open,
  onOpenChange,
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [rows, setRows] = useState<MedicalCertificate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !patient) return
    let cancelled = false
    setLoading(true)
    void fetchPatientDocumentsAction({
      studentId: patient.studentId,
      employeeId: patient.employeeId,
    }).then((result) => {
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
          <SheetTitle>Medical documents</SheetTitle>
          <SheetDescription>
            {patient
              ? `Certificates on file for ${patientFullName(patient)}`
              : "Patient certificates"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No medical certificates found for this patient yet.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border/70 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {row.certificateType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.certificateNumber}
                      {row.doctorName ? ` · ${row.doctorName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issued {formatDate(row.issuedAt)}
                      {row.validUntil
                        ? ` · Valid until ${formatDate(row.validUntil)}`
                        : ""}
                    </p>
                    {row.purpose ? (
                      <p className="text-xs text-muted-foreground">
                        Purpose: {row.purpose}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {row.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
