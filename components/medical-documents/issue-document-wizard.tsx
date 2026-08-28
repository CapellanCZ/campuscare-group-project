"use client"

import { useMemo, useState, useTransition } from "react"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { documentToasts } from "@/lib/feedback/toast-messages"

import { GoHomeSlipForm } from "@/components/medical-documents/forms/go-home-slip-form"
import { MedicalCertificationForm } from "@/components/medical-documents/forms/medical-certification-form"
import { NfgClearanceForm } from "@/components/medical-documents/forms/nfg-clearance-form"
import { PrescriptionForm } from "@/components/medical-documents/forms/prescription-form"
import {
  MedicalDocumentPreviewBody,
} from "@/components/medical-documents/document-print-view"
import { issueMedicalDocumentAction } from "@/features/medical-documents/actions"
import {
  buildConsultationDocumentContext,
  defaultGoHomeSlipPayload,
  defaultMedicalCertificationPayload,
  defaultNfgClearancePayload,
  defaultPrescriptionPayload,
  purposeLabelFromPayload,
  type ConsultationDocumentContext,
} from "@/features/medical-documents/lib/map-consultation-context"
import { ISSUE_DOCUMENT_TYPE_OPTIONS } from "@/features/medical-documents/lib/document-labels"
import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import type {
  GoHomeSlipPayload,
  MedicalCertificationPayload,
  MedicalDocument,
  MedicalDocumentType,
  NfgClearancePayload,
  PrescriptionPayload,
} from "@/types/medicalDocument"
import { DOCUMENT_TYPE_LABELS } from "@/types/medicalDocument"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type WizardStep = "form" | "preview"

function templateVersion(type: MedicalDocumentType): string {
  switch (type) {
    case "medical_certification":
      return "f001-2025"
    case "go_home_slip":
      return "f006-2025"
    case "prescription":
      return "rx-2025"
    case "nfg_medical_clearance":
      return "nfg-2026-v1"
    default:
      return "1"
  }
}

function validatePayload(
  type: MedicalDocumentType,
  payload: Record<string, unknown>
): string | null {
  if (type === "go_home_slip") {
    const p = payload as GoHomeSlipPayload
    if (!p.reason?.trim()) return "Reason is required for Go Home Slip."
  }
  if (type === "prescription") {
    const p = payload as PrescriptionPayload
    const meds = p.medications?.filter((m) => m.name?.trim()) ?? []
    if (meds.length === 0) return "Add at least one medication."
  }
  if (type === "medical_certification") {
    const p = payload as MedicalCertificationPayload
    if (p.purposeCategory === "others" && !p.purposeOther?.trim()) {
      return "Specify the purpose when Others is selected."
    }
  }
  if (type === "nfg_medical_clearance") {
    const p = payload as NfgClearancePayload
    if (!p.clearanceStatus) return "Select a clearance status."
  }
  return null
}

export function IssueDocumentWizard({
  open,
  onOpenChange,
  documentType,
  workspace,
  onIssued,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: MedicalDocumentType
  workspace: ClinicalVisitWorkspace
  onIssued: (document: MedicalDocument) => void
}) {
  const ctx = useMemo(
    () => buildConsultationDocumentContext(workspace),
    [workspace]
  )

  const { confirmPreset } = useConfirm()
  const [step, setStep] = useState<WizardStep>("form")
  const [certPayload, setCertPayload] = useState<MedicalCertificationPayload>(() =>
    defaultMedicalCertificationPayload(ctx)
  )
  const [goHomePayload, setGoHomePayload] = useState<GoHomeSlipPayload>(() =>
    defaultGoHomeSlipPayload(ctx)
  )
  const [rxPayload, setRxPayload] = useState<PrescriptionPayload>(() =>
    defaultPrescriptionPayload(ctx)
  )
  const [nfgPayload, setNfgPayload] = useState<NfgClearancePayload>(() =>
    defaultNfgClearancePayload(workspace, ctx)
  )
  const [isPending, startTransition] = useTransition()

  const payload = useMemo(() => {
    switch (documentType) {
      case "go_home_slip":
        return goHomePayload as Record<string, unknown>
      case "prescription":
        return rxPayload as Record<string, unknown>
      case "nfg_medical_clearance":
        return nfgPayload as Record<string, unknown>
      case "medical_certification":
      default:
        return certPayload as Record<string, unknown>
    }
  }, [documentType, certPayload, goHomePayload, rxPayload, nfgPayload])

  const purpose = useMemo(() => {
    if (documentType === "medical_certification") {
      return purposeLabelFromPayload(certPayload)
    }
    if (documentType === "go_home_slip") {
      return "Go Home Slip"
    }
    if (documentType === "prescription") {
      return "Prescription"
    }
    return "NFG Medical Clearance"
  }, [documentType, certPayload])

  const previewDocument = useMemo(
    (): MedicalDocument => ({
      id: "preview",
      documentNumber: "PREVIEW",
      documentType,
      patientId: ctx.patientId,
      consultationId: ctx.consultationId,
      patientRecordId: ctx.patientRecordId,
      purpose,
      doctorName: "Attending Physician",
      remarks: null,
      status: "draft",
      issuedAt: new Date().toISOString(),
      validUntil: null,
      issuedBy: null,
      templateVersion: templateVersion(documentType),
      payload,
      voidedBy: null,
      voidedAt: null,
      voidReason: null,
      replacesDocumentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      certificateType: DOCUMENT_TYPE_LABELS[documentType],
      patient: {
        id: ctx.patientId,
        fullName: ctx.patientName,
        studentId: ctx.campusId,
        email: null,
      },
    }),
    [ctx, documentType, payload, purpose]
  )

  const title =
    ISSUE_DOCUMENT_TYPE_OPTIONS.find((o) => o.type === documentType)?.title ??
    DOCUMENT_TYPE_LABELS[documentType]

  function resetAndClose() {
    setStep("form")
    onOpenChange(false)
  }

  function handleIssue() {
    const validationError = validatePayload(documentType, payload)
    if (validationError) {
      documentToasts.failed(validationError)
      return
    }

    startTransition(async () => {
      const result = await issueMedicalDocumentAction({
        documentType,
        patientId: ctx.patientId,
        patientRecordId: ctx.patientRecordId,
        consultationId: ctx.consultationId,
        purpose,
        payload,
        templateVersion: templateVersion(documentType),
      })

      if (!result.ok) {
        documentToasts.failed(result.error)
        return
      }

      if (documentType === "medical_certification") {
        documentToasts.certificateGenerated()
      } else {
        documentToasts.finalized()
      }
      onIssued(result.data)
      resetAndClose()
    })
  }

  function requestIssue() {
    const validationError = validatePayload(documentType, payload)
    if (validationError) {
      documentToasts.failed(validationError)
      return
    }

    const preset =
      documentType === "medical_certification"
        ? "generateCertificate"
        : "finalizeDocument"

    void confirmPreset(preset, {
      title: "Issue this document?",
      description: `This will permanently issue an official ${title} for ${ctx.patientName}. The document will be linked to this consultation and cannot be deleted — only voided if needed.`,
      confirmLabel: "Issue document",
      onConfirm: handleIssue,
    })
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) resetAndClose()
          else onOpenChange(next)
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,900px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {step === "form"
                ? "Complete the document details. Data is prefilled from this consultation."
                : "Review the official template before issuing."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {step === "form" ? (
              <>
                {documentType === "medical_certification" ? (
                  <MedicalCertificationForm
                    value={certPayload}
                    onChange={setCertPayload}
                  />
                ) : null}
                {documentType === "go_home_slip" ? (
                  <GoHomeSlipForm value={goHomePayload} onChange={setGoHomePayload} />
                ) : null}
                {documentType === "prescription" ? (
                  <PrescriptionForm value={rxPayload} onChange={setRxPayload} />
                ) : null}
                {documentType === "nfg_medical_clearance" ? (
                  <NfgClearanceForm value={nfgPayload} onChange={setNfgPayload} />
                ) : null}
              </>
            ) : (
              <div className="rounded-lg bg-neutral-200/80 p-4 dark:bg-neutral-900">
                <MedicalDocumentPreviewBody document={previewDocument} />
              </div>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            {step === "form" ? (
              <>
                <Button variant="outline" onClick={() => resetAndClose()}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const err = validatePayload(documentType, payload)
                    if (err) {
                      documentToasts.failed(err)
                      return
                    }
                    setStep("preview")
                  }}
                >
                  Preview
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep("form")}>
                  Back
                </Button>
                <Button onClick={requestIssue} disabled={isPending}>
                  Confirm & Issue
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
