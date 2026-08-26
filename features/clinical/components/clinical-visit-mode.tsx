"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { IconCheck, IconLoader2 } from "@tabler/icons-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveClinicalVisit } from "@/features/clinical/actions/consultation-visit"
import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import {
  serializeVisitDentalValue,
  VisitDentalForm,
  visitDentalValueFromWorkspace,
  type VisitDentalFormValue,
} from "@/features/clinical/components/visit-dental-form"
import { PageHeader } from "@/features/common/components/page-header"
import { VisitMedicalChart } from "@/features/physician/components/visit-medical-chart"
import { consultationStatusLabel } from "@/types/consultation"
import type { MedicalHistory, PhysicalExam } from "@/types/patientRecord"
import { formatClinicDateTime } from "@/lib/physician/timezone"

const steps = [
  { title: "Symptoms", description: "Chief complaint" },
  { title: "Diagnosis", description: "Clinical assessment" },
  { title: "Notes & Rx", description: "Plan and prescription" },
]

type ClinicalVisitModeProps = {
  workspace: ClinicalVisitWorkspace
}

export function ClinicalVisitMode({ workspace }: ClinicalVisitModeProps) {
  const router = useRouter()
  const isDentist = workspace.role === "dentist"
  const [step, setStep] = useState(1)
  const [symptoms, setSymptoms] = useState(workspace.symptoms ?? "")
  const [diagnosis, setDiagnosis] = useState(workspace.diagnosis ?? "")
  const [clinicalNotes, setClinicalNotes] = useState(workspace.assessment ?? "")
  const [prescription, setPrescription] = useState(workspace.prescription ?? "")
  const [dentalForm, setDentalForm] = useState<VisitDentalFormValue>(() =>
    visitDentalValueFromWorkspace({
      chiefComplaint: workspace.chiefComplaint ?? workspace.symptoms,
      assessment: workspace.assessment,
      diagnosis: workspace.diagnosis,
      treatment: workspace.treatment,
      prescription: workspace.prescription,
      notes: workspace.assessment,
      followUpDate: workspace.followUpDate,
    })
  )
  const [medicalChart, setMedicalChart] = useState<{
    medicalHistory: MedicalHistory
    physicalExam: PhysicalExam
  } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const readOnly = workspace.status === "completed"

  function persist(complete = false) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const payload = isDentist
        ? serializeVisitDentalValue(dentalForm)
        : {
            symptoms,
            diagnosis,
            clinicalNotes,
            prescription,
            treatment: undefined as string | undefined,
            followUpDate: null as string | null,
          }

      const result = await saveClinicalVisit({
        consultationId: workspace.consultationId,
        role: workspace.role,
        symptoms: payload.symptoms,
        diagnosis: payload.diagnosis,
        clinicalNotes: payload.clinicalNotes,
        prescription: payload.prescription,
        treatment: payload.treatment,
        followUpDate: payload.followUpDate,
        complete,
        medicalChart:
          !isDentist && complete && medicalChart && workspace.patientRecordId
            ? {
                patientRecordId: workspace.patientRecordId,
                medicalHistory: medicalChart.medicalHistory,
                physicalExam: medicalChart.physicalExam,
              }
            : undefined,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(complete ? "Consultation completed." : "Draft saved.")
      if (complete) {
        router.push(workspace.dashboardPath)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation"
        subtitle={workspace.patientName}
        description={`${formatClinicDateTime(workspace.consultationDate, "Asia/Manila")} · ${workspace.chiefComplaint ?? "No chief complaint"}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {consultationStatusLabel(workspace.status)}
        </Badge>
        {workspace.campusId ? (
          <span className="text-xs text-muted-foreground">
            Campus ID: {workspace.campusId}
          </span>
        ) : null}
      </div>

      {workspace.priorRecordsCount === 0 ? (
        <Alert variant="info">
          <AlertTitle>No previous records</AlertTitle>
          <AlertDescription>
            This patient has no prior consultation notes on file. Document the
            encounter carefully.
          </AlertDescription>
        </Alert>
      ) : null}

      {isDentist ? (
        <VisitDentalForm
          value={dentalForm}
          onChange={setDentalForm}
          readOnly={readOnly}
        />
      ) : (
        <VisitMedicalChart
          record={workspace.medicalRecord}
          nurseVitals={workspace.nurseVitals}
          readOnly={readOnly}
          onChartChange={setMedicalChart}
        />
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert variant="success" role="status">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {isDentist ? (
        !readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => persist(false)}
            >
              Save draft
            </Button>
            <Button disabled={isPending} onClick={() => persist(true)}>
              Complete consultation
            </Button>
          </div>
        ) : null
      ) : (
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Encounter workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Stepper
              value={step}
              onValueChange={setStep}
              indicators={{
                completed: <IconCheck className="size-3.5" />,
                loading: <IconLoader2 className="size-3.5 animate-spin" />,
              }}
              className="w-full space-y-8"
            >
              <StepperNav>
                {steps.map((item, index) => (
                  <StepperItem
                    key={item.title}
                    step={index + 1}
                    className="relative"
                  >
                    <StepperTrigger className="flex justify-start gap-1.5">
                      <StepperIndicator>{index + 1}</StepperIndicator>
                      <div className="flex flex-col items-start gap-0.5">
                        <StepperTitle>{item.title}</StepperTitle>
                        <StepperDescription>
                          {item.description}
                        </StepperDescription>
                      </div>
                    </StepperTrigger>
                    {steps.length > index + 1 ? (
                      <StepperSeparator className="md:mx-2.5" />
                    ) : null}
                  </StepperItem>
                ))}
              </StepperNav>

              <StepperPanel className="space-y-4 text-sm">
                <StepperContent value={1} className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms / chief complaint</Label>
                  <Textarea
                    id="symptoms"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={6}
                    disabled={readOnly}
                    placeholder="Onset, duration, severity, associated symptoms..."
                  />
                </StepperContent>
                <StepperContent value={2} className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Textarea
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    rows={6}
                    disabled={readOnly}
                    placeholder="Working diagnosis and differentials..."
                  />
                </StepperContent>
                <StepperContent value={3} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Clinical notes</Label>
                    <Textarea
                      id="notes"
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      rows={5}
                      disabled={readOnly}
                      placeholder="Exam findings, advice given, follow-up plan..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rx">Prescription</Label>
                    <Textarea
                      id="rx"
                      value={prescription}
                      onChange={(e) => setPrescription(e.target.value)}
                      rows={5}
                      disabled={readOnly}
                      placeholder="Medication, dose, frequency, duration..."
                    />
                  </div>
                </StepperContent>
              </StepperPanel>
            </Stepper>

            {!readOnly ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={step === 1 || isPending}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                >
                  Back
                </Button>
                {step < 3 ? (
                  <Button
                    disabled={isPending}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Continue
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => persist(false)}
                >
                  Save draft
                </Button>
                <Button disabled={isPending} onClick={() => persist(true)}>
                  Complete consultation
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
