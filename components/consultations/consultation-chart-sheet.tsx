"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { updateConsultationAction } from "@/features/consultations/actions"
import type { Consultation } from "@/types/consultation"

export function ConsultationChartSheet({
  open,
  consultation,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  consultation: Consultation | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [assessmentNotes, setAssessmentNotes] = useState("")
  const [diagnosis, setDiagnosis] = useState("")
  const [treatmentNotes, setTreatmentNotes] = useState("")
  const [prescription, setPrescription] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!consultation) return
    setAssessmentNotes(consultation.assessmentNotes ?? "")
    setDiagnosis(consultation.diagnosis ?? "")
    setTreatmentNotes(consultation.treatmentNotes ?? "")
    setPrescription(consultation.prescription ?? "")
  }, [consultation])

  function handleSave() {
    if (!consultation) return
    startTransition(async () => {
      const result = await updateConsultationAction({
        id: consultation.id,
        assessmentNotes,
        diagnosis,
        treatmentNotes,
        prescription,
        status: "in_progress",
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success("Consultation chart saved.")
      onOpenChange(false)
      onSaved()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Consultation chart</SheetTitle>
        </SheetHeader>

        {consultation ? (
          <div className="space-y-4 px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              {consultation.patientName} · {consultation.chiefComplaint}
            </p>
            <div className="space-y-2">
              <Label htmlFor="chart-assessment">Assessment</Label>
              <Textarea
                id="chart-assessment"
                value={assessmentNotes}
                onChange={(e) => setAssessmentNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-diagnosis">Diagnosis</Label>
              <Textarea
                id="chart-diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-treatment">Treatment</Label>
              <Textarea
                id="chart-treatment"
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-prescription">Prescription</Label>
              <Textarea
                id="chart-prescription"
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ) : null}

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!consultation || isPending} onClick={handleSave}>
            Save chart
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
