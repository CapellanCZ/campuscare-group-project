"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MedicalRecordPreview } from "@/components/patients/medical-record-preview"
import { patientFullName, type PatientRecord } from "@/types/patientRecord"

export function PatientProfileSheet({
  patient,
  open,
  onOpenChange,
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,800px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="gap-2 border-b px-6 py-5 text-left">
          <DialogTitle className="pr-8 text-lg">
            {patient ? patientFullName(patient) : "Patient profile"}
          </DialogTitle>
          <DialogDescription>
            Student medical record from CampusCare.
          </DialogDescription>
        </DialogHeader>
        {patient ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <MedicalRecordPreview patient={patient} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
