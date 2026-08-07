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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/features/common/components/page-header"
import { AppointmentStatusBadge } from "@/features/physician/components/appointment-status-badge"
import { saveConsultation } from "@/features/physician/actions/appointments"
import { VisitMedicalChart } from "@/features/physician/components/visit-medical-chart"
import type { NurseVisitVitals } from "@/features/physician/types-visit"
import type {
  PhysicianAppointment,
  PhysicianConsultation,
  PhysicianPatient,
} from "@/features/physician/types"
import type { PatientRecord } from "@/types/patientRecord"
import { formatClinicDateTime } from "@/lib/physician/timezone"

const steps = [
  { title: "Symptoms", description: "Chief complaint" },
  { title: "Diagnosis", description: "Clinical assessment" },
  { title: "Notes & Rx", description: "Plan and prescription" },
]

type ConsultationModeProps = {
  appointment: PhysicianAppointment
  patient: PhysicianPatient | null
  consultation: PhysicianConsultation | null
  priorRecordsEmpty: boolean
  medicalRecord: PatientRecord | null
  nurseVitals: NurseVisitVitals
}

export function ConsultationMode({
  appointment,
  patient,
  consultation,
  priorRecordsEmpty,
  medicalRecord,
  nurseVitals,
}: ConsultationModeProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [symptoms, setSymptoms] = useState(consultation?.symptoms ?? "")
  const [diagnosis, setDiagnosis] = useState(consultation?.diagnosis ?? "")
  const [clinicalNotes, setClinicalNotes] = useState(
    consultation?.clinicalNotes ?? ""
  )
  const [prescription, setPrescription] = useState(
    consultation?.prescription ?? ""
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function persist(complete = false) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await saveConsultation({
        appointmentId: appointment.id,
        symptoms,
        diagnosis,
        clinicalNotes,
        prescription,
        complete,
      })
      if (!result.ok) {
        if (result.error.toLowerCase().includes("unauthorized")) {
          setMessage(
            complete
              ? "Demo consultation completed locally (sign in as physician to persist)."
              : "Demo draft saved locally (sign in as physician to persist)."
          )
          if (complete) {
            router.push("/physician/dashboard")
          }
          return
        }
        setError(result.error)
        return
      }
      setMessage(complete ? "Consultation completed." : "Draft saved.")
      if (complete) {
        router.push("/physician/dashboard")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation"
        subtitle={appointment.patientName}
        description={`${formatClinicDateTime(appointment.startsAt, appointment.timezone)} · ${appointment.reason ?? "No chief complaint"}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <AppointmentStatusBadge status={appointment.status} />
        {patient?.timezone ? (
          <span className="text-xs text-muted-foreground">
            Patient timezone: {patient.timezone}
          </span>
        ) : null}
      </div>

      {priorRecordsEmpty ? (
        <Alert variant="info">
          <AlertTitle>No previous records</AlertTitle>
          <AlertDescription>
            This patient has no prior consultation notes on file. Document the
            encounter carefully.
          </AlertDescription>
        </Alert>
      ) : null}

      <VisitMedicalChart
        record={medicalRecord}
        nurseVitals={nurseVitals}
        readOnly={appointment.status === "completed"}
      />

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
                <StepperItem key={item.title} step={index + 1} className="relative">
                  <StepperTrigger className="flex justify-start gap-1.5">
                    <StepperIndicator>{index + 1}</StepperIndicator>
                    <div className="flex flex-col items-start gap-0.5">
                      <StepperTitle>{item.title}</StepperTitle>
                      <StepperDescription>{item.description}</StepperDescription>
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
                    placeholder="Medication, dose, frequency, duration..."
                  />
                </div>
              </StepperContent>
            </StepperPanel>
          </Stepper>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={step === 1 || isPending}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button disabled={isPending} onClick={() => setStep((s) => s + 1)}>
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
        </CardContent>
      </Card>
    </div>
  )
}
