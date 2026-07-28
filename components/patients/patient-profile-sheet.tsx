"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  patientFullName,
  type PatientRecord,
} from "@/types/patientRecord"

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{value?.trim() || "—"}</dd>
    </div>
  )
}

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {patient ? patientFullName(patient) : "Patient profile"}
          </SheetTitle>
          <SheetDescription>
            Complete patient record from CampusCare.
          </SheetDescription>
        </SheetHeader>
        {patient ? (
          <dl className="flex-1 space-y-3 overflow-y-auto px-4 pb-6">
            <Row label="Student ID" value={patient.studentId} />
            <Row label="Course" value={patient.course} />
            <Row label="Year level" value={patient.yearLevel} />
            <Row label="Gender" value={patient.gender} />
            <Row label="Birth date" value={patient.birthDate} />
            <Row label="Blood type" value={patient.bloodType} />
            <Row label="Allergies" value={patient.allergies} />
            <Row label="Phone" value={patient.phone} />
            <Row label="Email" value={patient.email} />
            <Row label="Address" value={patient.address} />
            <Row
              label="Emergency"
              value={
                [patient.emergencyContactName, patient.emergencyContactPhone]
                  .filter(Boolean)
                  .join(" · ") || null
              }
            />
            <Row label="Conditions" value={patient.medicalConditions} />
            <Row label="Notes" value={patient.notes} />
            <Row label="Last visit" value={patient.lastVisit} />
            <Row
              label="Consults"
              value={String(patient.consultationsCount)}
            />
          </dl>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
