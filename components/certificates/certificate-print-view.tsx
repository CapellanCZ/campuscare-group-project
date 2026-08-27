"use client"

import type { MedicalCertificate } from "@/types/medicalCertificate"
import {
  certificateToDocument,
  MedicalDocumentPreviewBody,
  MedicalDocumentPrintView,
} from "@/components/medical-documents/document-print-view"

/** Hidden print layout — only shown via `@media print`. */
export function CertificatePrintView({
  certificate,
}: {
  certificate: MedicalCertificate
}) {
  const document = certificateToDocument(certificate)
  return <MedicalDocumentPrintView document={document} />
}

/** On-screen certificate image-style preview. */
export function CertificatePreviewDocument({
  certificate,
}: {
  certificate: MedicalCertificate
}) {
  const document = certificateToDocument(certificate)
  return <MedicalDocumentPreviewBody document={document} />
}
