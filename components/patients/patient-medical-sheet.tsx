"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { PatientMedicalConfirmDialog } from "@/components/patients/patient-medical-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { updatePatientMedicalRecordAction } from "@/features/patients/actions"
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

function ReadOnly({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="grid gap-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value?.trim() || "—"}</dd>
    </div>
  )
}

export function PatientMedicalSheet({
  patient,
  open,
  onOpenChange,
  onSaved,
}: {
  patient: PatientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (patient: PatientRecord) => void
}) {
  const [history, setHistory] = useState<MedicalHistory>({
    ...EMPTY_MEDICAL_HISTORY,
  })
  const [exam, setExam] = useState<PhysicalExam>({ ...EMPTY_PHYSICAL_EXAM })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !patient) return
    setHistory({ ...EMPTY_MEDICAL_HISTORY, ...patient.medicalHistory })
    setExam({ ...EMPTY_PHYSICAL_EXAM, ...patient.physicalExam })
    setConfirmOpen(false)
  }, [open, patient])

  const studentId = patient ? patientCampusId(patient) : null
  const age = patient ? patientAgeYears(patient.birthDate) : null
  const family = patient?.familyBackground

  function setFlag(
    key: Exclude<keyof MedicalHistory, "previousIllnessOrSurgery">,
    checked: boolean
  ) {
    setHistory((prev) => ({ ...prev, [key]: checked }))
  }

  function setExamField(key: keyof PhysicalExam, value: string) {
    setExam((prev) => ({ ...prev, [key]: value }))
  }

  function handleConfirmSave() {
    if (!patient || !studentId) return
    startTransition(async () => {
      const result = await updatePatientMedicalRecordAction({
        id: patient.id,
        medicalHistory: history,
        physicalExam: exam,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Medical record updated.")
      setConfirmOpen(false)
      onOpenChange(false)
      onSaved(result.data)
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {patient ? `Medical record · ${patientFullName(patient)}` : "Medical record"}
            </SheetTitle>
            <SheetDescription>
              Identity fields are locked from enrollment. Update medical history
              and physical examination only.
            </SheetDescription>
          </SheetHeader>

          {patient ? (
            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold tracking-wide uppercase">
                  General Personal Information
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly label="Surname" value={patient.lastName} />
                  <ReadOnly label="Given name" value={patient.firstName} />
                  <ReadOnly label="Middle name" value={patient.middleName} />
                  <ReadOnly label="Course" value={patient.course} />
                  <ReadOnly label="Student ID No." value={studentId} />
                  <ReadOnly label="Year level" value={patient.yearLevel} />
                  <ReadOnly label="Address" value={patient.address} />
                  <ReadOnly label="Contact No." value={patient.phone} />
                  <ReadOnly label="Birthdate" value={patient.birthDate} />
                  <ReadOnly
                    label="Age"
                    value={age != null ? String(age) : null}
                  />
                  <ReadOnly label="Sex" value={patient.gender} />
                  <ReadOnly label="Status" value={patient.civilStatus} />
                  <ReadOnly label="Religion" value={patient.religion} />
                  <ReadOnly label="Nationality" value={patient.nationality} />
                </dl>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold tracking-wide uppercase">
                  Emergency Contact Information
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <ReadOnly
                    label="Person to notify"
                    value={
                      family?.guardianName ?? patient.emergencyContactName
                    }
                  />
                  <ReadOnly
                    label="Relationship"
                    value={family?.relationship}
                  />
                  <ReadOnly
                    label="Contact No."
                    value={family?.mobile ?? patient.emergencyContactPhone}
                  />
                  <ReadOnly label="Nationality" value={patient.nationality} />
                </dl>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold tracking-wide uppercase">
                  Medical History
                </h3>
                <FieldGroup className="gap-3">
                  <Field>
                    <FieldLabel htmlFor="prev-illness">
                      History of Previous Illness / Surgical Operation
                    </FieldLabel>
                    <Textarea
                      id="prev-illness"
                      value={history.previousIllnessOrSurgery}
                      onChange={(e) =>
                        setHistory((prev) => ({
                          ...prev,
                          previousIllnessOrSurgery: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </Field>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {HISTORY_FLAGS.map((flag) => (
                      <label
                        key={flag.key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={Boolean(history[flag.key])}
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

              <section className="space-y-3">
                <h3 className="text-sm font-semibold tracking-wide uppercase">
                  Physical Examination
                </h3>
                <FieldGroup className="gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(
                      [
                        ["bloodPressure", "Blood Pressure"],
                        ["pulseRate", "Pulse Rate"],
                        ["temperature", "Temperature"],
                        ["weight", "Weight"],
                        ["height", "Height"],
                        ["o2", "O2"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field key={key}>
                        <FieldLabel htmlFor={`pe-${key}`}>{label}</FieldLabel>
                        <Input
                          id={`pe-${key}`}
                          value={exam[key]}
                          onChange={(e) => setExamField(key, e.target.value)}
                        />
                      </Field>
                    ))}
                  </div>

                  {(
                    [
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
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key}>
                      <FieldLabel htmlFor={`pe-${key}`}>{label}</FieldLabel>
                      <Input
                        id={`pe-${key}`}
                        value={exam[key]}
                        onChange={(e) => setExamField(key, e.target.value)}
                      />
                    </Field>
                  ))}

                  <Field>
                    <FieldLabel htmlFor="pe-other">
                      Other Pertinent Findings
                    </FieldLabel>
                    <Textarea
                      id="pe-other"
                      value={exam.otherPertinentFindings}
                      onChange={(e) =>
                        setExamField("otherPertinentFindings", e.target.value)
                      }
                      rows={3}
                    />
                  </Field>
                </FieldGroup>
              </section>

              <p className="text-xs text-muted-foreground">
                Last edited:{" "}
                {formatLastEdited(
                  patient.lastEditedAt,
                  patient.lastEditedByName
                )}
              </p>
            </div>
          ) : null}

          <SheetFooter className="gap-2 border-t px-4 py-3 sm:flex-row">
            <SheetClose render={<Button type="button" variant="outline" />}>
              Cancel
            </SheetClose>
            <Button
              type="button"
              disabled={!patient || !studentId || pending}
              onClick={() => setConfirmOpen(true)}
            >
              Save medical record
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {studentId ? (
        <PatientMedicalConfirmDialog
          open={confirmOpen}
          studentId={studentId}
          pending={pending}
          onOpenChange={setConfirmOpen}
          onConfirm={handleConfirmSave}
        />
      ) : null}
    </>
  )
}
