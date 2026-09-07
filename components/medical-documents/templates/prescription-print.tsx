import { HsoHeader } from "@/components/medical-documents/templates/shared/hso-header"
import {
  HsoFullPageDocument,
  HsoFullPageTitle,
} from "@/components/medical-documents/templates/shared/hso-full-page"
import { formatDiagnosticRequestLines } from "@/lib/medical-documents/diagnostic-request-options"
import type { MedicalDocument, PrescriptionPayload } from "@/types/medicalDocument"

export function PrescriptionPrint({
  document,
  className,
}: {
  document: MedicalDocument
  className?: string
}) {
  const payload = document.payload as PrescriptionPayload
  const meds = payload.medications ?? []
  const license =
    (document.payload.physicianLicenseNumber as string | undefined) ?? ""
  const diagnosticLines = payload.diagnosticRequests
    ? formatDiagnosticRequestLines(payload.diagnosticRequests)
    : []

  return (
    <HsoFullPageDocument className={className}>
      <HsoHeader formCode="NUD-ADM-HSO Prescription Form" />
      <HsoFullPageTitle>Prescription</HsoFullPageTitle>

      <dl className="mt-6 grid grid-cols-[88px_1fr] gap-x-4 gap-y-3 text-[11px]">
        <dt className="font-semibold text-neutral-700">Name</dt>
        <dd className="border-b border-neutral-400 pb-0.5 font-semibold">
          {document.patient.fullName}
        </dd>
        <dt className="font-semibold text-neutral-700">Address</dt>
        <dd className="border-b border-neutral-400 pb-0.5">
          {payload.patientAddress ?? "—"}
        </dd>
        <dt className="font-semibold text-neutral-700">Age / Sex</dt>
        <dd className="border-b border-neutral-400 pb-0.5">
          {[payload.patientAge, payload.patientSex].filter(Boolean).join(" / ") ||
            "—"}
        </dd>
        <dt className="font-semibold text-neutral-700">Date</dt>
        <dd className="border-b border-neutral-400 pb-0.5">
          {document.issuedAt
            ? new Intl.DateTimeFormat("en-PH", {
                timeZone: "Asia/Manila",
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(new Date(document.issuedAt))
            : "—"}
        </dd>
      </dl>

      <div className="mt-8">
        <p className="font-serif text-3xl italic leading-none text-neutral-800">
          ℞
        </p>
        <ol className="mt-4 list-decimal space-y-4 pl-5">
          {meds.map((med, index) => (
            <li key={index} className="print:break-inside-avoid">
              <p className="font-semibold">{med.name}</p>
              <p className="mt-0.5 text-[10px] text-neutral-700">
                {[
                  med.strength,
                  med.quantity ? `Qty: ${med.quantity}` : null,
                  med.frequency,
                  med.route,
                  med.duration,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {med.instructions ? (
                <p className="mt-1 text-[10px] italic text-neutral-600">
                  {med.instructions}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {diagnosticLines.length > 0 ? (
        <div className="mt-6 print:break-inside-avoid">
          {diagnosticLines.length === 1 ? (
            <p className="text-[11px] font-semibold text-neutral-800">
              Request for {diagnosticLines[0]}
            </p>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-neutral-800">
                Request for:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] text-neutral-800">
                {diagnosticLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      <footer className="mt-14 border-t border-neutral-200 pt-5 text-[10px]">
        <div className="max-w-xs">
          <p className="font-semibold text-neutral-700">Licensed No.</p>
          <p className="mt-1 min-h-[1.25rem] border-b border-black">
            {license || "\u00a0"}
          </p>
        </div>
        <p className="mt-6 font-semibold">
          {document.doctorName ?? "Physician"}
        </p>
        <p className="mt-1 text-neutral-500">
          Document No. {document.documentNumber}
        </p>
      </footer>
    </HsoFullPageDocument>
  )
}
