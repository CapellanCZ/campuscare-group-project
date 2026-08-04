"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  patientAgeYears,
  patientCampusId,
  patientFullName,
  type MedicalHistory,
  type PatientRecord,
  type PhysicalExam,
} from "@/types/patientRecord"

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[9.5rem_1fr] items-start gap-x-4 gap-y-1 py-2.5 text-sm">
      <dt className="pt-0.5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words leading-relaxed font-medium">
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}

function FlagRow({ history }: { history: MedicalHistory }) {
  const flags: { key: keyof MedicalHistory; label: string }[] = [
    { key: "allergy", label: "Allergy" },
    { key: "asthma", label: "Asthma" },
    { key: "tb", label: "TB" },
    { key: "hpn", label: "HPN" },
    { key: "gynecologicalObstetrical", label: "Gynecological / Obstetrical" },
    { key: "smoker", label: "Smoker" },
    { key: "alcoholicDrinker", label: "Alcoholic Drinker" },
    { key: "diabetesMellitus", label: "Diabetes Mellitus" },
    { key: "heartAilment", label: "Heart Ailment" },
    { key: "kidneyDisease", label: "Kidney Disease" },
  ]
  const active = flags
    .filter((flag) => history[flag.key] === true)
    .map((flag) => flag.label)
  return <Row label="Conditions" value={active.length ? active.join(", ") : "None marked"} />
}

function ExamBlock({ exam }: { exam: PhysicalExam }) {
  const rows: [string, string][] = [
    ["Blood Pressure", exam.bloodPressure],
    ["Pulse Rate", exam.pulseRate],
    ["Temperature", exam.temperature],
    ["Weight", exam.weight],
    ["Height", exam.height],
    ["O2", exam.o2],
    ["Skin", exam.skin],
    ["Eyes (O.D)", exam.eyesOd],
    ["Eyes (O.S)", exam.eyesOs],
    ["Ears (A.D)", exam.earsAd],
    ["Ears (A.S)", exam.earsAs],
    ["Nose", exam.nose],
    ["Throat", exam.throat],
    ["Neck", exam.neck],
    ["Thorax", exam.thorax],
    ["Heart", exam.heart],
    ["Lungs", exam.lungs],
    ["Abdomen", exam.abdomen],
    ["Extremities", exam.extremities],
    ["Deformities", exam.deformities],
    ["Other findings", exam.otherPertinentFindings],
  ]
  return (
    <div className="divide-y divide-border/50">
      {rows.map(([label, value]) => (
        <Row key={label} label={label} value={value} />
      ))}
    </div>
  )
}

function formatLastEdited(
  at: string | null | undefined,
  byName: string | null | undefined
): string {
  if (!at) return "Never edited"
  const formatted = new Date(at).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  })
  return byName ? `${formatted} by ${byName}` : formatted
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
  const family = patient?.familyBackground
  const age = patient ? patientAgeYears(patient.birthDate) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader className="gap-2 border-b pb-5">
          <SheetTitle className="pr-8 text-lg">
            {patient ? patientFullName(patient) : "Patient profile"}
          </SheetTitle>
          <SheetDescription>
            Student medical record from CampusCare.
          </SheetDescription>
        </SheetHeader>
        {patient ? (
          <dl className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <div className="space-y-1">
              <p className="mb-3 text-sm font-semibold tracking-tight">
                General Personal Information
              </p>
              <div className="divide-y divide-border/50">
                <Row label="Student ID" value={patientCampusId(patient)} />
                <Row label="Course" value={patient.course} />
                <Row label="Year level" value={patient.yearLevel} />
                <Row label="Sex" value={patient.gender} />
                <Row label="Birth date" value={patient.birthDate} />
                <Row label="Age" value={age != null ? String(age) : null} />
                <Row label="Status" value={patient.civilStatus} />
                <Row label="Religion" value={patient.religion} />
                <Row label="Nationality" value={patient.nationality} />
                <Row label="Phone" value={patient.phone} />
                <Row label="Email" value={patient.email} />
                <Row label="Address" value={patient.address} />
              </div>
            </div>

            <div className="space-y-1">
              <p className="mb-3 text-sm font-semibold tracking-tight">
                Emergency Contact Details
              </p>
              <div className="divide-y divide-border/50">
                <Row
                  label="Guardian"
                  value={family?.guardianName ?? patient.emergencyContactName}
                />
                <Row label="Relationship" value={family?.relationship} />
                <Row label="Occupation" value={family?.occupation} />
                <Row label="Address" value={family?.address} />
                <Row
                  label="Mobile"
                  value={family?.mobile ?? patient.emergencyContactPhone}
                />
                <Row label="Email" value={family?.email} />
              </div>
            </div>

            <div className="space-y-1">
              <p className="mb-3 text-sm font-semibold tracking-tight">
                Medical History
              </p>
              <div className="divide-y divide-border/50">
                <Row
                  label="Previous illness / surgery"
                  value={patient.medicalHistory.previousIllnessOrSurgery}
                />
                <FlagRow history={patient.medicalHistory} />
              </div>
            </div>

            <div className="space-y-1">
              <p className="mb-3 text-sm font-semibold tracking-tight">
                Physical Examination
              </p>
              <ExamBlock exam={patient.physicalExam} />
            </div>

            <div className="divide-y divide-border/50 border-t pt-2">
              <Row
                label="Last edited"
                value={formatLastEdited(
                  patient.lastEditedAt,
                  patient.lastEditedByName
                )}
              />
              <Row
                label="Consults"
                value={String(patient.consultationsCount)}
              />
            </div>
          </dl>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
