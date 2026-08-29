"use client"

import { useEffect, useState } from "react"
import { consultationToasts } from "@/lib/feedback/toast-messages"

import { ConsultationSummaryContent } from "@/components/consultations/consultation-summary-content"
import { fetchConsultationVisitDetailAction } from "@/features/patients/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { Consultation } from "@/types/consultation"
import type { QueueVitals } from "@/lib/health/types"

type PreviewProps = {
  mode: "preview"
  visit: Consultation
  ticketVitals?: QueueVitals | null
  onConfirm: () => Promise<void>
  pending?: boolean
}

type CompletedProps = {
  mode?: "completed"
  consultationId: string | null
  onDone?: () => void
  doneLabel?: string
}

type ConsultationSummaryDialogProps = {
  patientName?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
} & (PreviewProps | CompletedProps)

export function ConsultationSummaryDialog(
  props: ConsultationSummaryDialogProps
) {
  const { patientName, open, onOpenChange } = props
  const isPreview = props.mode === "preview"

  const [loading, setLoading] = useState(false)
  const [visit, setVisit] = useState<Consultation | null>(
    isPreview ? props.visit : null
  )
  const [ticketVitals, setTicketVitals] = useState<QueueVitals | null>(
    isPreview ? (props.ticketVitals ?? null) : null
  )

  const previewVisit = isPreview ? props.visit : null
  const previewTicketVitals = isPreview ? props.ticketVitals : null
  const consultationId = !isPreview ? props.consultationId : null

  useEffect(() => {
    if (isPreview) {
      setVisit(previewVisit)
      setTicketVitals(previewTicketVitals ?? null)
      return
    }

    if (!open || !consultationId) {
      setVisit(null)
      setTicketVitals(null)
      return
    }

    let cancelled = false
    setLoading(true)
    void fetchConsultationVisitDetailAction(consultationId).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        consultationToasts.failed(result.error)
        return
      }
      setVisit(result.data.consultation)
      setTicketVitals(result.data.ticketVitals)
    })

    return () => {
      cancelled = true
    }
  }, [consultationId, isPreview, open, previewTicketVitals, previewVisit])

  const pending = isPreview ? (props.pending ?? false) : false

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,760px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-5 text-left">
          <DialogTitle>
            {isPreview ? "Review consultation summary" : "Consultation completed"}
          </DialogTitle>
          <DialogDescription>
            {isPreview
              ? "Review the summary below. Confirm to complete and save to the patient record, or cancel to continue editing."
              : "Summary saved to the patient record. This copy is also available in patient history."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : visit ? (
            <ConsultationSummaryContent
              visit={visit}
              ticketVitals={ticketVitals}
              patientName={patientName}
              hideStatusBadge={isPreview}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Could not load the consultation summary.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-end">
          {isPreview ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending || !visit}
                onClick={() => void props.onConfirm()}
              >
                {pending ? "Completing…" : "Confirm"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false)
                props.onDone?.()
              }}
            >
              {props.doneLabel ?? "Done"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
