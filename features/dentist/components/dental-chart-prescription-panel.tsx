"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { IconFileText, IconPlus } from "@tabler/icons-react"

import { DocumentPreviewDialog } from "@/components/medical-documents/document-preview-dialog"
import { IssueDocumentWizard } from "@/components/medical-documents/issue-document-wizard"
import {
  documentTypeLabel,
  isHalfBondDocument,
  MedicalDocumentPrintView,
} from "@/components/medical-documents/document-print-view"
import { IssuedPrescriptionSummary } from "@/features/clinical/components/issued-prescription-summary"
import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import { loadDentalDocumentWorkspaceAction } from "@/features/dentist/actions/dental-documents"
import { formatCertificateDateTime } from "@/features/certificates/lib/format"
import {
  fetchMedicalDocumentsByConsultationAction,
  logMedicalDocumentViewAction,
} from "@/features/medical-documents/actions"
import {
  documentStatusLabel,
  documentStatusVariant,
} from "@/features/medical-documents/lib/document-status"
import { triggerMedicalDocumentPrint } from "@/lib/print/trigger-medical-document-print"
import type { MedicalDocument } from "@/types/medicalDocument"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Dentist chart prescription issuance — Prescription only (with Request for checklist).
 */
export function DentalChartPrescriptionPanel({
  appointmentId,
  readOnly = false,
  onPrescriptionTextChange,
}: {
  appointmentId: string
  readOnly?: boolean
  onPrescriptionTextChange?: (text: string) => void
}) {
  const [workspace, setWorkspace] = useState<ClinicalVisitWorkspace | null>(null)
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<MedicalDocument | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [printDoc, setPrintDoc] = useState<MedicalDocument | null>(null)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const workspaceResult = await loadDentalDocumentWorkspaceAction(appointmentId)
    if (!workspaceResult.ok) {
      setLoading(false)
      setError(workspaceResult.error)
      return
    }
    setWorkspace(workspaceResult.data)
    const docsResult = await fetchMedicalDocumentsByConsultationAction(
      workspaceResult.data.consultationId
    )
    setLoading(false)
    if (!docsResult.ok) {
      setError(docsResult.error)
      return
    }
    setDocuments(docsResult.data)
  }, [appointmentId])

  useEffect(() => {
    void load()
  }, [load])

  function handlePrint(document: MedicalDocument) {
    setPrintDoc(document)
    startTransition(async () => {
      await logMedicalDocumentViewAction(document.id)
      triggerMedicalDocumentPrint(
        isHalfBondDocument(document) ? "half-bond" : "full-page"
      )
    })
  }

  const prescriptions = documents.filter(
    (doc) => doc.documentType === "prescription"
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Prescription</Label>
          <p className="text-xs text-muted-foreground">
            Issue an official prescription with dental diagnostic requests.
          </p>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            size="sm"
            disabled={loading || !workspace}
            onClick={() => setWizardOpen(true)}
          >
            <IconPlus className="size-4" />
            Issue Prescription
          </Button>
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : error ? (
        <p className="rounded-md border border-dashed border-destructive/40 px-3 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <>
          <IssuedPrescriptionSummary
            documents={prescriptions}
            onTextChange={onPrescriptionTextChange}
          />
          {prescriptions.length > 0 ? (
            <ul className="space-y-2">
              {prescriptions.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {documentTypeLabel(doc)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.documentNumber} ·{" "}
                      {formatCertificateDateTime(doc.issuedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={documentStatusVariant(doc.status)}>
                      {documentStatusLabel(doc.status)}
                    </Badge>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setPreviewDoc(doc)
                        setPreviewOpen(true)
                        void logMedicalDocumentViewAction(doc.id)
                      }}
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => handlePrint(doc)}
                    >
                      Print
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <div className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-center text-sm text-muted-foreground">
              <IconFileText className="mx-auto mb-1 size-6 opacity-50" />
              No prescription issued yet.
            </div>
          ) : null}
        </>
      )}

      {workspace ? (
        <IssueDocumentWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          documentType="prescription"
          workspace={workspace}
          onIssued={() => {
            void load()
          }}
        />
      ) : null}

      <DocumentPreviewDialog
        document={previewDoc}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onPrint={() => {
          if (!previewDoc) return
          setPreviewOpen(false)
          handlePrint(previewDoc)
        }}
      />

      {printDoc ? <MedicalDocumentPrintView document={printDoc} /> : null}
    </div>
  )
}
