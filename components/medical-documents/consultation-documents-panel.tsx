"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { IconFileText, IconPlus } from "@tabler/icons-react"
import { toast } from "sonner"

import { IssueDocumentTypeDialog } from "@/components/medical-documents/issue-document-type-dialog"
import { IssueDocumentWizard } from "@/components/medical-documents/issue-document-wizard"
import { DocumentPreviewDialog } from "@/components/medical-documents/document-preview-dialog"
import { MedicalDocumentPrintView } from "@/components/medical-documents/document-print-view"
import { documentTypeLabel } from "@/components/medical-documents/document-print-view"
import {
  fetchMedicalDocumentsByConsultationAction,
  logMedicalDocumentViewAction,
} from "@/features/medical-documents/actions"
import type { ClinicalVisitWorkspace } from "@/features/clinical/data/load-consultation-workspace"
import type { MedicalDocument, MedicalDocumentType } from "@/types/medicalDocument"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  documentStatusLabel,
  documentStatusVariant,
} from "@/features/medical-documents/lib/document-status"
import { formatCertificateDateTime } from "@/features/certificates/lib/format"
import { triggerMedicalDocumentPrint } from "@/lib/print/trigger-medical-document-print"

export function ConsultationDocumentsPanel({
  workspace,
  canIssue,
}: {
  workspace: ClinicalVisitWorkspace
  canIssue: boolean
}) {
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<MedicalDocumentType | null>(
    null
  )
  const [previewDoc, setPreviewDoc] = useState<MedicalDocument | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [printDoc, setPrintDoc] = useState<MedicalDocument | null>(null)
  const [, startTransition] = useTransition()

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    const result = await fetchMedicalDocumentsByConsultationAction(
      workspace.consultationId
    )
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setDocuments(result.data)
  }, [workspace.consultationId])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  function handleSelectType(type: MedicalDocumentType) {
    setSelectedType(type)
    setWizardOpen(true)
  }

  function handlePrint(document: MedicalDocument) {
    setPrintDoc(document)
    startTransition(async () => {
      await logMedicalDocumentViewAction(document.id)
      triggerMedicalDocumentPrint()
    })
  }

  return (
    <>
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Medical Documents</CardTitle>
            <p className="text-sm text-muted-foreground">
              Official HSO documents issued for this consultation.
            </p>
          </div>
          {canIssue ? (
            <Button size="sm" onClick={() => setTypeDialogOpen(true)}>
              <IconPlus className="size-4" />
              Issue Medical Document
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              <IconFileText className="mx-auto mb-2 size-8 opacity-50" />
              No documents issued yet for this visit.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="font-medium">{documentTypeLabel(doc)}</p>
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
                  <Button size="xs" onClick={() => handlePrint(doc)}>
                    Print
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <IssueDocumentTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        onSelect={handleSelectType}
      />

      {selectedType ? (
        <IssueDocumentWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          documentType={selectedType}
          workspace={workspace}
          onIssued={() => {
            void loadDocuments()
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
    </>
  )
}
