import { HsoHeader } from "@/components/medical-documents/templates/shared/hso-header"
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
    <article
      className={cn(
        "mx-auto max-w-[780px] bg-white p-8 font-serif text-[11px] leading-relaxed text-black print:break-after-page",
        className
      )}
    >
      <HsoHeader formCode="NUD-ADM-HSO Prescription Form" />

      <h1 className="mt-4 text-center text-base font-bold uppercase">Prescription</h1>

      <dl className="mt-6 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2">
        <dt>Name</dt>
        <dd className="border-b border-neutral-400 font-semibold">
          {document.patient.fullName}
        </dd>
        <dt>Address</dt>
        <dd className="border-b border-neutral-400">
          {payload.patientAddress ?? "—"}
        </dd>
        <dt>Age / Sex</dt>
        <dd className="border-b border-neutral-400">
          {[payload.patientAge, payload.patientSex].filter(Boolean).join(" / ") ||
            "—"}
        </dd>
        <dt>Date</dt>
        <dd className="border-b border-neutral-400">
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
        <p className="text-2xl font-serif italic">℞</p>
        <ol className="mt-4 list-decimal space-y-4 pl-6">
          {meds.map((med, index) => (
            <li key={index} className="print:break-inside-avoid">
              <p className="font-semibold">{med.name}</p>
              <p className="text-[10px]">
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
                <p className="mt-1 italic">{med.instructions}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <footer className="mt-16 border-t border-neutral-300 pt-4 text-[10px]">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p>Licensed No.</p>
            <p className="mt-1 border-b border-black">{license || " "}</p>
          </div>
          <div>
            <p>PTR No.</p>
            <p className="mt-1 border-b border-black">&nbsp;</p>
          </div>
          <div>
            <p>S2 No.</p>
            <p className="mt-1 border-b border-black">&nbsp;</p>
          </div>
        </div>
        <p className="mt-6 font-semibold">
          {document.doctorName ?? "Physician"}
        </p>
        <p className="text-neutral-600">Document No. {document.documentNumber}</p>
      </footer>
    </article>
  )
}
