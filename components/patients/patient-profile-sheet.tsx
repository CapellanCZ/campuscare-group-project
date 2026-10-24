"use client"

import { IconId, IconUserHeart } from "@tabler/icons-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MedicalRecordPreview } from "@/components/patients/medical-record-preview"
import {
  patientCampusId,
  patientFullName,
  patientTypeLabel,
  type PatientRecord,
} from "@/types/patientRecord"

export function PatientProfileSheet({
  patient,
  open,
  onOpenChange,
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const campusId = patient ? patientCampusId(patient) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,860px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="gap-3 border-b bg-muted/20 px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
              <IconUserHeart className="size-5" stroke={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="space-y-1">
                <DialogTitle className="text-lg leading-snug text-balance">
                  {patient ? patientFullName(patient) : "Patient profile"}
                </DialogTitle>
                <DialogDescription>
                  Student medical record from CampusCare.
                </DialogDescription>
              </div>
              {patient ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {campusId ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                      <IconId className="size-3 opacity-70" stroke={1.75} />
                      {campusId}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center rounded-md border border-border/70 bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {patientTypeLabel(patient.patientType)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        {patient ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/15 px-5 py-5 sm:px-6">
            <MedicalRecordPreview patient={patient} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
