"use client"

import type { ReactNode } from "react"

import {
  patientAgeYears,
  patientCampusId,
  patientFullName,
  patientTypeIsStudent,
  patientTypeLabel,
  type MedicalHistory,
  type PatientRecord,
  type PhysicalExam,
} from "@/types/patientRecord"
import { cn } from "@/lib/utils"

function formatBirthDate(value: string | null | undefined) {
  if (!value?.trim()) return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(parsed))
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-background",
        className
      )}
    >
      <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {title}
        </h3>
      </div>
      <div className="divide-y divide-border/55 px-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  className,
}: {
  label: string
  value: string | null | undefined
  className?: string
}) {
  return (
    <div className={cn("min-w-0 py-2.5", className)}>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0 text-sm leading-snug font-medium break-words text-foreground">
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}

function FieldRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">{children}</div>
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

  return (
    <Field
      label="Conditions"
      value={active.length ? active.join(", ") : "None marked"}
      className="sm:col-span-2"
    />
  )
}

function ExamBlock({ exam }: { exam: PhysicalExam }) {
  const vitals: [string, string][] = [
    ["Blood pressure", exam.bloodPressure],
    ["Pulse rate", exam.pulseRate],
    ["Temperature", exam.temperature],
    ["Weight", exam.weight],
    ["Height", exam.height],
    ["O2", exam.o2],
  ]
  const findings: [string, string][] = [
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
    <>
      <FieldRow>
        {vitals.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </FieldRow>
      <FieldRow>
        {findings.map(([label, value]) => (
          <Field
            key={label}
            label={label}
            value={value}
            className={
              label === "Other findings" ? "sm:col-span-2" : undefined
            }
          />
        ))}
      </FieldRow>
    </>
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

export function MedicalRecordPreview({ patient }: { patient: PatientRecord }) {
  const family = patient.familyBackground
  const age = patientAgeYears(patient.birthDate)
  const isStudent = patientTypeIsStudent(patient.patientType)

  return (
    <dl className="space-y-4">
      <Section title="General personal information">
        <FieldRow>
          <Field label="Campus ID" value={patientCampusId(patient)} />
          <Field
            label="Patient type"
            value={patientTypeLabel(patient.patientType)}
          />
          {isStudent ? (
            <>
              <Field label="Course" value={patient.course} />
              <Field label="Year level" value={patient.yearLevel} />
            </>
          ) : null}
          <Field label="Sex" value={patient.gender} />
          <Field label="Age" value={age != null ? String(age) : null} />
          <Field
            label="Birth date"
            value={formatBirthDate(patient.birthDate)}
          />
          <Field label="Status" value={patient.civilStatus} />
          <Field label="Religion" value={patient.religion} />
          <Field label="Nationality" value={patient.nationality} />
          <Field label="Phone" value={patient.phone} />
          <Field label="Email" value={patient.email} />
          <Field
            label="Address"
            value={patient.address}
            className="sm:col-span-2"
          />
        </FieldRow>
      </Section>

      <Section title="Emergency contact">
        <FieldRow>
          <Field
            label="Guardian"
            value={family?.guardianName ?? patient.emergencyContactName}
          />
          <Field label="Relationship" value={family?.relationship} />
          <Field label="Occupation" value={family?.occupation} />
          <Field
            label="Mobile"
            value={family?.mobile ?? patient.emergencyContactPhone}
          />
          <Field label="Email" value={family?.email} />
          <Field
            label="Address"
            value={family?.address}
            className="sm:col-span-2"
          />
        </FieldRow>
      </Section>

      <Section title="Medical history">
        <FieldRow>
          <Field
            label="Previous illness / surgery"
            value={patient.medicalHistory.previousIllnessOrSurgery}
            className="sm:col-span-2"
          />
          <FlagRow history={patient.medicalHistory} />
        </FieldRow>
      </Section>

      <Section title="Physical examination">
        <ExamBlock exam={patient.physicalExam} />
      </Section>

      <Section title="Record activity">
        <FieldRow>
          <Field
            label="Last edited"
            value={formatLastEdited(
              patient.lastEditedAt,
              patient.lastEditedByName
            )}
          />
          <Field
            label="Consults"
            value={String(patient.consultationsCount)}
          />
        </FieldRow>
      </Section>
    </dl>
  )
}

export function MedicalRecordPreviewHeader({
  patient,
}: {
  patient: PatientRecord
}) {
  return (
    <p className="text-sm text-muted-foreground">
      Medical record for {patientFullName(patient)}
    </p>
  )
}
