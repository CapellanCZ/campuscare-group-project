"use client"

import { SelectWithOtherField } from "@/components/shared/select-with-other-field"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  DENTAL_CHIEF_COMPLAINT_OPTIONS,
  DENTAL_DIAGNOSIS_OPTIONS,
  DENTAL_TREATMENT_OPTIONS,
  formatDentalAssessment,
  formatDentalPrescription,
  parseDentalAssessment,
  parseDentalPrescription,
  type DentalExamFields,
  type DentalPrescriptionFields,
} from "@/lib/health/dental-form-options"

export type VisitDentalFormValue = {
  chiefComplaint: string
  oralFindings: string
  teethCondition: string
  gumCondition: string
  softTissue: string
  diagnosis: string
  treatment: string
  rxMedication: string
  rxDosage: string
  rxFrequency: string
  rxDuration: string
  followUpRequired: "yes" | "no"
  followUpDate: string
  notes: string
}

export function visitDentalValueFromWorkspace(input: {
  chiefComplaint: string | null
  assessment: string | null
  diagnosis: string | null
  treatment: string | null
  prescription: string | null
  notes: string | null
  followUpDate: string | null
}): VisitDentalFormValue {
  const exam = parseDentalAssessment(input.assessment)
  const rx = parseDentalPrescription(input.prescription)
  return {
    chiefComplaint: input.chiefComplaint ?? "",
    oralFindings: exam.oralFindings,
    teethCondition: exam.teethCondition,
    gumCondition: exam.gumCondition,
    softTissue: exam.softTissue,
    diagnosis: input.diagnosis ?? "",
    treatment: input.treatment ?? "",
    rxMedication: rx.medication,
    rxDosage: rx.dosage,
    rxFrequency: rx.frequency,
    rxDuration: rx.duration,
    followUpRequired: input.followUpDate ? "yes" : "no",
    followUpDate: input.followUpDate?.slice(0, 10) ?? "",
    notes: input.notes ?? "",
  }
}

export function serializeVisitDentalValue(form: VisitDentalFormValue): {
  symptoms: string
  diagnosis: string
  clinicalNotes: string
  prescription: string
  treatment: string
  followUpDate: string | null
} {
  const exam: DentalExamFields = {
    oralFindings: form.oralFindings,
    teethCondition: form.teethCondition,
    gumCondition: form.gumCondition,
    softTissue: form.softTissue,
  }
  const rx: DentalPrescriptionFields = {
    medication: form.rxMedication,
    dosage: form.rxDosage,
    frequency: form.rxFrequency,
    duration: form.rxDuration,
  }
  const assessment = formatDentalAssessment(exam)
  const notesExtra = form.notes.trim()
  return {
    symptoms: form.chiefComplaint.trim(),
    diagnosis: form.diagnosis.trim(),
    clinicalNotes: notesExtra
      ? `${assessment}\n\nNotes: ${notesExtra}`
      : assessment,
    prescription: formatDentalPrescription(rx),
    treatment: form.treatment.trim(),
    followUpDate:
      form.followUpRequired === "yes" && form.followUpDate
        ? form.followUpDate
        : null,
  }
}

type VisitDentalFormProps = {
  value: VisitDentalFormValue
  onChange: (next: VisitDentalFormValue) => void
  readOnly?: boolean
}

export function VisitDentalForm({
  value,
  onChange,
  readOnly = false,
}: VisitDentalFormProps) {
  function update<K extends keyof VisitDentalFormValue>(
    key: K,
    next: VisitDentalFormValue[K]
  ) {
    onChange({ ...value, [key]: next })
  }

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-base">Dental consultation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Record oral examination, diagnosis, treatment, and follow-up for this
          visit.
        </p>
      </CardHeader>
      <CardContent className="pt-(--card-spacing)">
        <FieldGroup className="gap-5">
          <SelectWithOtherField
            id="dental-chief-complaint"
            label="Chief complaint *"
            options={DENTAL_CHIEF_COMPLAINT_OPTIONS}
            value={value.chiefComplaint}
            onValueChange={(v) => update("chiefComplaint", v)}
            placeholder="Select complaint"
            otherPlaceholder="Describe the complaint…"
            required
            disabled={readOnly}
          />

          <p className="text-sm font-medium">Dental examination</p>
          <Field>
            <FieldLabel htmlFor="oralFindings">Oral examination findings</FieldLabel>
            <Textarea
              id="oralFindings"
              value={value.oralFindings}
              disabled={readOnly}
              onChange={(e) => update("oralFindings", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="teethCondition">Teeth condition</FieldLabel>
            <Textarea
              id="teethCondition"
              value={value.teethCondition}
              disabled={readOnly}
              onChange={(e) => update("teethCondition", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="gumCondition">Gum condition</FieldLabel>
            <Textarea
              id="gumCondition"
              value={value.gumCondition}
              disabled={readOnly}
              onChange={(e) => update("gumCondition", e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="softTissue">Oral soft tissue findings</FieldLabel>
            <Textarea
              id="softTissue"
              value={value.softTissue}
              disabled={readOnly}
              onChange={(e) => update("softTissue", e.target.value)}
            />
          </Field>

          <SelectWithOtherField
            id="dental-diagnosis"
            label="Diagnosis"
            options={DENTAL_DIAGNOSIS_OPTIONS}
            value={value.diagnosis}
            onValueChange={(v) => update("diagnosis", v)}
            placeholder="Select diagnosis"
            otherPlaceholder="Custom diagnosis…"
            disabled={readOnly}
          />
          <SelectWithOtherField
            id="dental-treatment"
            label="Treatment provided"
            options={DENTAL_TREATMENT_OPTIONS}
            value={value.treatment}
            onValueChange={(v) => update("treatment", v)}
            placeholder="Select treatment"
            otherPlaceholder="Custom treatment…"
            disabled={readOnly}
          />

          <p className="text-sm font-medium">Prescription</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rxMedication">Medication</FieldLabel>
              <Input
                id="rxMedication"
                value={value.rxMedication}
                disabled={readOnly}
                onChange={(e) => update("rxMedication", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rxDosage">Dosage</FieldLabel>
              <Input
                id="rxDosage"
                value={value.rxDosage}
                disabled={readOnly}
                onChange={(e) => update("rxDosage", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rxFrequency">Frequency</FieldLabel>
              <Input
                id="rxFrequency"
                value={value.rxFrequency}
                disabled={readOnly}
                onChange={(e) => update("rxFrequency", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rxDuration">Duration</FieldLabel>
              <Input
                id="rxDuration"
                value={value.rxDuration}
                disabled={readOnly}
                onChange={(e) => update("rxDuration", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Follow-up required</FieldLabel>
              <Select
                value={value.followUpRequired}
                disabled={readOnly}
                onValueChange={(v) => {
                  if (v === "yes" || v === "no") {
                    onChange({
                      ...value,
                      followUpRequired: v,
                      followUpDate: v === "no" ? "" : value.followUpDate,
                    })
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="followUpDate">Follow-up date</FieldLabel>
              <Input
                id="followUpDate"
                type="date"
                disabled={readOnly || value.followUpRequired !== "yes"}
                value={value.followUpDate}
                onChange={(e) => update("followUpDate", e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="dental-notes">
              Consultation notes / additional instructions
            </FieldLabel>
            <Textarea
              id="dental-notes"
              value={value.notes}
              disabled={readOnly}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
