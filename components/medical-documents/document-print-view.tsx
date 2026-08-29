"use client"

import { GoHomeSlipPrint } from "@/components/medical-documents/templates/go-home-slip-print"
import { MedicalCertificationPrint } from "@/components/medical-documents/templates/medical-certification-print"
import { NfgClearancePrint } from "@/components/medical-documents/templates/nfg-clearance-print"
import { PrescriptionPrint } from "@/components/medical-documents/templates/prescription-print"
import { HsoFormPreviewFrame } from "@/components/medical-documents/templates/shared/hso-half-bond-page"
import { HsoFullPagePreviewFrame } from "@/components/medical-documents/templates/shared/hso-full-page"
import type { MedicalCertificate } from "@/types/medicalCertificate"
import type { MedicalDocument } from "@/types/medicalDocument"
import { DOCUMENT_TYPE_LABELS } from "@/types/medicalDocument"
import { cn } from "@/lib/utils"

export function certificateToDocument(
  certificate: MedicalCertificate
): MedicalDocument {
  return {
    id: certificate.id,
    documentNumber: certificate.certificateNumber,
    documentType: "medical_certification",
    patientId: certificate.patientId,
    consultationId: null,
    patientRecordId: null,
    purpose: certificate.purpose,
    doctorName: certificate.doctorName,
    remarks: certificate.remarks,
    status:
      (certificate.status as MedicalDocument["status"]) === "voided"
        ? "voided"
        : (certificate.status as MedicalDocument["status"]),
    issuedAt: certificate.issuedAt,
    validUntil: certificate.validUntil,
    issuedBy: certificate.issuedBy,
    templateVersion: "1",
    payload: {
      legacyCertificateType: certificate.certificateType,
      legacyRemarks: certificate.remarks,
    },
    voidedBy: null,
    voidedAt: null,
    voidReason: null,
    replacesDocumentId: null,
    createdAt: certificate.createdAt,
    updatedAt: certificate.updatedAt,
    certificateType: certificate.certificateType,
    patient: certificate.patient,
  }
}

export function isHalfBondDocument(document: MedicalDocument): boolean {
  return document.documentType === "medical_certification"
}

export function MedicalDocumentPrintBody({
  document,
  className,
}: {
  document: MedicalDocument
  className?: string
}) {
  switch (document.documentType) {
    case "go_home_slip":
      return <GoHomeSlipPrint document={document} className={className} />
    case "prescription":
      return <PrescriptionPrint document={document} className={className} />
    case "nfg_medical_clearance":
      return <NfgClearancePrint document={document} className={className} />
    case "medical_certification":
    default:
      return <MedicalCertificationPrint document={document} className={className} />
  }
}

export function MedicalDocumentPrintView({
  document,
}: {
  document: MedicalDocument
}) {
  const halfBond = isHalfBondDocument(document)

  return (
    <div
      id="medical-document-print"
      data-print-layout={halfBond ? "half-bond" : "full-page"}
      className={cn("hidden print:block", !halfBond && "medical-document-print--full-page")}
      aria-hidden
    >
      <MedicalDocumentPrintBody document={document} className="shadow-none" />
    </div>
  )
}

export function MedicalDocumentPreviewBody({
  document,
  className,
}: {
  document: MedicalDocument
  className?: string
}) {
  const content = (
    <MedicalDocumentPrintBody document={document} className={className} />
  )

  if (isHalfBondDocument(document)) {
    return <HsoFormPreviewFrame>{content}</HsoFormPreviewFrame>
  }

  return <HsoFullPagePreviewFrame>{content}</HsoFullPagePreviewFrame>
}

export function documentTypeLabel(document: MedicalDocument): string {
  return DOCUMENT_TYPE_LABELS[document.documentType] ?? document.certificateType
}
