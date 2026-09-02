"use client"

import Link from "next/link"
import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { IconCheck, IconLoader2 } from "@tabler/icons-react"

import {
  buildDentalFormConsultationPreview,
  buildPhysicianConsultationPreview,
} from "@/components/consultations/build-consultation-preview"
import { ConsultationSummaryDialog } from "@/components/consultations/consultation-summary-dialog"
import { ConsultationDocumentsPanel } from "@/components/medical-documents/consultation-documents-panel"
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
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  IssuedPrescriptionSummary,
  issuedPrescriptionTextFromDocuments,
} from "@/features/clinical/components/issued-prescription-summary"
import type { MedicalDocument } from "@/types/medicalDocument"
import { saveClinicalVisit } from "@/features/clinical/actions/consultation-visit"
import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import {
  serializeVisitDentalValue,
  VisitDentalForm,
  visitDentalValueFromWorkspace,
  type VisitDentalFormValue,
} from "@/features/clinical/components/visit-dental-form"
import { HsoFormShell } from "@/features/common/components/hso-form-shell"
import { PageHeader } from "@/features/common/components/page-header"
import { VisitMedicalChart } from "@/features/physician/components/visit-medical-chart"
import type { QueueVitals } from "@/lib/health/types"
import { formatClinicDateTime } from "@/lib/physician/timezone"
import { cn } from "@/lib/utils"
import { useStaffRealtimeRouterRefresh } from "@/hooks/use-staff-realtime-refresh"
import { STAFF_REALTIME_TABLES } from "@/lib/health/realtime"
import { consultationStatusLabel } from "@/types/consultation"
import type { Consultation } from "@/types/consultation"
import type { MedicalHistory, PhysicalExam } from "@/types/patientRecord"

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
  const queuePath = isDentist ? "/dentist/queue" : "/physician/queue"

  useStaffRealtimeRouterRefresh(
    `staff-clinical-visit-${workspace.consultationId}`,
    STAFF_REALTIME_TABLES.clinicalVisit
  )

  const [step, setStep] = useState(1)
  const [symptoms, setSymptoms] = useState(workspace.symptoms ?? "")
  const [diagnosis, setDiagnosis] = useState(workspace.diagnosis ?? "")
  const [clinicalNotes, setClinicalNotes] = useState(workspace.assessment ?? "")
  const [followUpDate, setFollowUpDate] = useState(
    workspace.followUpDate?.slice(0, 10) ?? ""
  )
  const [issuedDocuments, setIssuedDocuments] = useState<MedicalDocument[]>([])
  const handleDocumentsChange = useCallback((docs: MedicalDocument[]) => {
    setIssuedDocuments(docs)
  }, [])
  const issuedPrescription = issuedPrescriptionTextFromDocuments(issuedDocuments)
  const prescription = issuedPrescription || workspace.prescription || ""
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
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryPreview, setSummaryPreview] = useState<{
    visit: Consultation
    ticketVitals: QueueVitals | null
  } | null>(null)
  const [completing, setCompleting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const readOnly = workspace.status === "completed"

  function persist(complete = false): Promise<void> {
    setError(null)
    setMessage(null)
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        const payload = isDentist
          ? {
              ...serializeVisitDentalValue(dentalForm),
              prescription,
            }
          : {
              symptoms,
              diagnosis,
              clinicalNotes,
              prescription,
              treatment: undefined as string | undefined,
              followUpDate: followUpDate.trim() || null,
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
          reject(new Error(result.error))
          return
        }
        if (complete) {
          resolve()
          return
        }
        setMessage("Draft saved.")
        resolve()
      })
    })
  }

  function openCompletePreview() {
    const preview = isDentist
      ? buildDentalFormConsultationPreview({
          workspace,
          dentalForm,
          prescription,
        })
      : buildPhysicianConsultationPreview({
          workspace,
          symptoms,
          diagnosis,
          clinicalNotes,
          prescription,
          followUpDate: followUpDate.trim() || null,
        })
    setSummaryPreview(preview)
    setSummaryOpen(true)
  }

  async function confirmComplete() {
    setCompleting(true)
    try {
      await persist(true)
      setSummaryOpen(false)
      setSummaryPreview(null)
      router.push(queuePath)
      router.refresh()
    } catch {
      // Error surfaced inline via setError in persist
    } finally {
      setCompleting(false)
    }
  }

  const summaryDialog = summaryPreview ? (
    <ConsultationSummaryDialog
      mode="preview"
      visit={summaryPreview.visit}
      ticketVitals={summaryPreview.ticketVitals}
      patientName={workspace.patientName}
      open={summaryOpen}
      onOpenChange={setSummaryOpen}
      onConfirm={confirmComplete}
      pending={completing}
    />
  ) : null

  if (isDentist) {
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

        <VisitDentalForm
          value={dentalForm}
          onChange={setDentalForm}
          readOnly={readOnly}
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

        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => persist(false)}
            >
              Save draft
            </Button>
            <Button disabled={isPending} onClick={openCompletePreview}>
              Complete consultation
            </Button>
          </div>
        ) : null}

        <IssuedPrescriptionSummary documents={issuedDocuments} />

        <ConsultationDocumentsPanel
          workspace={workspace}
          canIssue={workspace.canIssueDocuments && !readOnly}
          onDocumentsChange={handleDocumentsChange}
        />

        {summaryDialog}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <PageHeader
        title={readOnly ? "Medical Record (Completed)" : "Medical Record"}
        description={
          workspace.campusId
            ? `${workspace.patientName} · ${workspace.campusId}`
            : workspace.patientName
        }
      />

      {readOnly ? (
        <Alert>
          <AlertTitle>Consultation completed</AlertTitle>
          <AlertDescription>
            This record is read-only. Medical history, exam findings, and
            treatment notes were saved with the patient record.
          </AlertDescription>
        </Alert>
      ) : null}

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

      <HsoFormShell
        title="Medical Record"
        formCode="NUD-ADM-HSO-F011"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href={queuePath}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Back to queue
            </Link>
            {readOnly ? (
              <Link
                href="/physician/consultations"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Consultations
              </Link>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => persist(false)}
                >
                  {isPending ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : null}
                  Save draft
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={openCompletePreview}
                >
                  {isPending ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4" />
                  )}
                  Complete consultation
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-neutral-300 pb-3">
          <Badge variant="outline">
            {consultationStatusLabel(workspace.status)}
          </Badge>
          <span className="text-xs text-neutral-600">
            {formatClinicDateTime(workspace.consultationDate, "Asia/Manila")}
          </span>
          {workspace.chiefComplaint ? (
            <span className="text-xs text-neutral-600">
              · {workspace.chiefComplaint}
            </span>
          ) : null}
        </div>

        {workspace.priorRecordsCount === 0 ? (
          <Alert variant="info" className="mb-4">
            <AlertTitle>No previous records</AlertTitle>
            <AlertDescription>
              This patient has no prior consultation notes on file. Document the
              encounter carefully.
            </AlertDescription>
          </Alert>
        ) : null}

        <VisitMedicalChart
          record={workspace.medicalRecord}
          nurseVitals={workspace.nurseVitals}
          readOnly={readOnly}
          onChartChange={setMedicalChart}
          paperLayout
        />

        <section className="mt-6 space-y-6 border-t border-neutral-300 pt-6">
          <h3 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase">
            Encounter workflow
          </h3>

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
                  disabled={readOnly}
                  className="rounded-none border-neutral-400 font-sans"
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
                  className="rounded-none border-neutral-400 font-sans"
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
                    className="rounded-none border-neutral-400 font-sans"
                    placeholder="Exam findings, advice given, follow-up plan..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="follow-up-date">Follow-up date (optional)</Label>
                  <Input
                    id="follow-up-date"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    disabled={readOnly}
                    className="max-w-xs rounded-none border-neutral-400 font-sans"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prescription</Label>
                  <IssuedPrescriptionSummary documents={issuedDocuments} />
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
                <Button disabled={isPending} onClick={() => setStep((s) => s + 1)}>
                  Continue
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="mt-6 border-t border-neutral-300 pt-6">
          <ConsultationDocumentsPanel
            workspace={workspace}
            canIssue={workspace.canIssueDocuments && !readOnly}
            onDocumentsChange={handleDocumentsChange}
          />
        </section>
      </HsoFormShell>

      {summaryDialog}
    </div>
  )
}
