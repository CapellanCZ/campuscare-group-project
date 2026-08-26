"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updatePatientMedicalRecordAction } from "@/features/patients/actions"
import type { NurseVisitVitals } from "@/features/physician/types-visit"
import { mergeNurseVitalsIntoExam } from "@/features/physician/lib/merge-nurse-vitals"
import {
  EMPTY_MEDICAL_HISTORY,
  EMPTY_PHYSICAL_EXAM,
  patientAgeYears,
  patientCampusId,
  patientFullName,
  type MedicalHistory,
  type PatientRecord,
  type PhysicalExam,
} from "@/types/patientRecord"

const HISTORY_FLAGS: {
  key: Exclude<keyof MedicalHistory, "previousIllnessOrSurgery">
  label: string
}[] = [
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

const PE_SYSTEMS = [
  ["skin", "Skin"],
  ["eyesOd", "Eyes (O.D)"],
  ["eyesOs", "Eyes (O.S)"],
  ["earsAd", "Ears (A.D)"],
  ["earsAs", "Ears (A.S)"],
  ["nose", "Nose"],
  ["throat", "Throat"],
  ["neck", "Neck"],
  ["thorax", "Thorax"],
  ["heart", "Heart"],
  ["lungs", "Lungs"],
  ["abdomen", "Abdomen"],
  ["extremities", "Extremities"],
  ["deformities", "Deformities"],
  ["otherPertinentFindings", "Other Pertinent Findings"],
] as const

function ReadOnly({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="grid gap-1.5 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="leading-relaxed font-medium break-words">
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}

export function VisitMedicalChart({
  record,
  nurseVitals,
  readOnly = false,
  onChartChange,
}: {
  record: PatientRecord | null
  nurseVitals: NurseVisitVitals
  readOnly?: boolean
  onChartChange?: (chart: {
    medicalHistory: MedicalHistory
    physicalExam: PhysicalExam
  }) => void
}) {
  const [history, setHistory] = useState<MedicalHistory>({
    ...EMPTY_MEDICAL_HISTORY,
  })
  const [exam, setExam] = useState<PhysicalExam>({ ...EMPTY_PHYSICAL_EXAM })
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!record) {
      setHistory({ ...EMPTY_MEDICAL_HISTORY })
      setExam(mergeNurseVitalsIntoExam({ ...EMPTY_PHYSICAL_EXAM }, nurseVitals))
      return
    }
    setHistory({ ...EMPTY_MEDICAL_HISTORY, ...record.medicalHistory })
    setExam(
      mergeNurseVitalsIntoExam(
        { ...EMPTY_PHYSICAL_EXAM, ...record.physicalExam },
        nurseVitals
      )
    )
  }, [record, nurseVitals])

  useEffect(() => {
    if (!onChartChange) return
    onChartChange({
      medicalHistory: history,
      physicalExam: mergeNurseVitalsIntoExam(exam, nurseVitals),
    })
  }, [history, exam, nurseVitals, onChartChange])

  if (!record) {
    return (
      <Alert variant="warning">
        <AlertTitle>Medical record unavailable</AlertTitle>
        <AlertDescription>
          Could not load the student medical record from the enrollment dataset.
          You can still complete SOAP notes below.
        </AlertDescription>
      </Alert>
    )
  }

  const campusId = patientCampusId(record)
  const age = patientAgeYears(record.birthDate)
  const family = record.familyBackground

  function setFlag(
    key: Exclude<keyof MedicalHistory, "previousIllnessOrSurgery">,
    checked: boolean
  ) {
    setHistory((prev) => ({ ...prev, [key]: checked }))
  }

  function setExamField(key: keyof PhysicalExam, value: string) {
    setExam((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!record) return
    const patientId = record.id
    startTransition(async () => {
      const physicalExam = mergeNurseVitalsIntoExam(exam, nurseVitals)
      const result = await updatePatientMedicalRecordAction({
        id: patientId,
        medicalHistory: history,
        physicalExam,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Medical record saved.")
    })
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-base">
          MEDICAL RECORD · {patientFullName(record)}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Demographics from enrollment. Vital signs from nurse intake. History
          and exam findings are part of this consultation.
        </p>
      </CardHeader>
      <CardContent className="space-y-10 pt-(--card-spacing)">
        <section className="space-y-5">
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            General Personal Information
          </h3>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnly label="Surname" value={record.lastName} />
            <ReadOnly label="Given name" value={record.firstName} />
            <ReadOnly label="Middle name" value={record.middleName} />
            <ReadOnly label="Course" value={record.course} />
            <ReadOnly label="Student ID No." value={campusId} />
            <ReadOnly label="Year level" value={record.yearLevel} />
            <ReadOnly label="Address" value={record.address} />
            <ReadOnly label="Contact No." value={record.phone} />
            <ReadOnly label="Birthdate" value={record.birthDate} />
            <ReadOnly label="Age" value={age != null ? String(age) : null} />
            <ReadOnly label="Sex" value={record.gender} />
            <ReadOnly label="Status" value={record.civilStatus} />
            <ReadOnly label="Religion" value={record.religion} />
            <ReadOnly label="Nationality" value={record.nationality} />
          </dl>
        </section>

        <section className="space-y-5 border-t pt-8">
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            Emergency Contact Information
          </h3>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnly
              label="Person to notify"
              value={family?.guardianName ?? record.emergencyContactName}
            />
            <ReadOnly label="Relationship" value={family?.relationship} />
            <ReadOnly
              label="Contact No."
              value={family?.mobile ?? record.emergencyContactPhone}
            />
          </dl>
        </section>

        <section className="space-y-5 border-t pt-8">
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase">
              Vital Signs
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Recorded by the nurse before this consultation.
            </p>
          </div>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
            <ReadOnly label="Blood Pressure" value={nurseVitals.bloodPressure} />
            <ReadOnly label="Pulse Rate" value={nurseVitals.pulseRate} />
            <ReadOnly label="Temperature" value={nurseVitals.temperature} />
            <ReadOnly label="Weight" value={nurseVitals.weight} />
            <ReadOnly label="Height" value={nurseVitals.height} />
            <ReadOnly label="O2" value={nurseVitals.o2} />
          </dl>
        </section>

        <section className="space-y-5 border-t pt-8">
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            Medical History
          </h3>
          <FieldGroup className="gap-5">
            <Field className="gap-2.5">
              <FieldLabel htmlFor="visit-prev-illness">
                History of Previous Illness / Surgical Operation
              </FieldLabel>
              <Textarea
                id="visit-prev-illness"
                value={history.previousIllnessOrSurgery}
                onChange={(e) =>
                  setHistory((prev) => ({
                    ...prev,
                    previousIllnessOrSurgery: e.target.value,
                  }))
                }
                rows={3}
                disabled={readOnly}
                className="min-h-20"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {HISTORY_FLAGS.map((flag) => (
                <label
                  key={flag.key}
                  className="flex items-center gap-3 rounded-xl border border-border/50 px-3.5 py-3 text-sm"
                >
                  <Checkbox
                    checked={Boolean(history[flag.key])}
                    disabled={readOnly}
                    onCheckedChange={(checked) =>
                      setFlag(flag.key, checked === true)
                    }
                  />
                  {flag.label}
                </label>
              ))}
            </div>
          </FieldGroup>
        </section>

        <section className="space-y-5 border-t pt-8">
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            Physical Examination
          </h3>
          <FieldGroup className="gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {PE_SYSTEMS.map(([key, label]) => (
                <Field key={key} className="gap-2.5">
                  <FieldLabel htmlFor={`visit-pe-${key}`}>{label}</FieldLabel>
                  <Input
                    id={`visit-pe-${key}`}
                    value={exam[key]}
                    disabled={readOnly}
                    onChange={(e) => setExamField(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </FieldGroup>
        </section>

        {!readOnly ? (
          <div className="flex justify-end border-t pt-6">
            <Button type="button" disabled={pending} onClick={handleSave}>
              {pending ? "Saving…" : "Save medical record"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
