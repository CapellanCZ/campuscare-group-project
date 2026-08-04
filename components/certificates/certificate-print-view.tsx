"use client"

import type { MedicalCertificate } from "@/types/medicalCertificate"
import {
  formatCertificateDate,
  formatCertificateDateTime,
} from "@/features/certificates/lib/format"
import { cn } from "@/lib/utils"

function CertificateDocument({
  certificate,
  className,
}: {
  certificate: MedicalCertificate
  className?: string
}) {
  return (
    <article
      className={cn(
        "mx-auto max-w-[720px] bg-white p-10 text-black shadow-sm",
        className
      )}
    >
      <header className="border-b border-black pb-4 text-center">
        <p className="text-xs tracking-[0.2em] uppercase">CampusCare Clinic</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Medical Certificate
        </h1>
        <p className="mt-1 text-sm">
          Certificate No. {certificate.certificateNumber}
        </p>
      </header>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          This is to certify that{" "}
          <strong>{certificate.patient.fullName}</strong>
          {certificate.patient.studentId
            ? ` (Student No. ${certificate.patient.studentId})`
            : ""}{" "}
          was examined / attended to at the campus clinic.
        </p>

        <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2">
          <dt className="text-neutral-600">Certificate type</dt>
          <dd className="font-medium">{certificate.certificateType}</dd>

          <dt className="text-neutral-600">Purpose</dt>
          <dd>{certificate.purpose ?? "—"}</dd>

          <dt className="text-neutral-600">Issued</dt>
          <dd>{formatCertificateDateTime(certificate.issuedAt)}</dd>

          <dt className="text-neutral-600">Valid until</dt>
          <dd>{formatCertificateDate(certificate.validUntil)}</dd>

          <dt className="text-neutral-600">Status</dt>
          <dd className="capitalize">{certificate.status}</dd>
        </dl>

        {certificate.remarks ? (
          <div className="mt-6">
            <p className="text-neutral-600">Remarks</p>
            <p className="mt-1 whitespace-pre-wrap">{certificate.remarks}</p>
          </div>
        ) : null}
      </section>

      <footer className="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div>
          <div className="h-12 border-b border-black" />
          <p className="mt-2 font-medium">
            {certificate.doctorName ?? "Attending clinician"}
          </p>
          <p className="text-neutral-600">Physician / Dentist</p>
        </div>
        <div>
          <div className="h-12 border-b border-black" />
          <p className="mt-2 font-medium">Clinic stamp</p>
          <p className="text-neutral-600">CampusCare</p>
        </div>
      </footer>
    </article>
  )
}

/** Hidden print layout — only shown via `@media print`. */
export function CertificatePrintView({
  certificate,
}: {
  certificate: MedicalCertificate
}) {
  return (
    <div
      id="medical-certificate-print"
      className="hidden print:block"
      aria-hidden
    >
      <CertificateDocument certificate={certificate} className="shadow-none" />
    </div>
  )
}

/** On-screen certificate image-style preview. */
export function CertificatePreviewDocument({
  certificate,
}: {
  certificate: MedicalCertificate
}) {
  return <CertificateDocument certificate={certificate} />
}
