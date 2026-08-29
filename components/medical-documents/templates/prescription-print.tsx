import { HsoHeader } from "@/components/medical-documents/templates/shared/hso-header"
import {
  HsoFullPageDocument,
  HsoFullPageTitle,
} from "@/components/medical-documents/templates/shared/hso-full-page"
import type { MedicalDocument, PrescriptionPayload } from "@/types/medicalDocument"
import { cn } from "@/lib/utils"

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

  return (
    <HsoFullPageDocument
      className={cn("print:break-after-page", className)}
    >
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

      <footer className="mt-14 border-t border-neutral-200 pt-5 text-[10px]">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="font-semibold text-neutral-700">Licensed No.</p>
            <p className="mt-1 min-h-[1.25rem] border-b border-black">
              {license || "\u00a0"}
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-700">PTR No.</p>
            <p className="mt-1 min-h-[1.25rem] border-b border-black">&nbsp;</p>
          </div>
          <div>
            <p className="font-semibold text-neutral-700">S2 No.</p>
            <p className="mt-1 min-h-[1.25rem] border-b border-black">&nbsp;</p>
          </div>
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
