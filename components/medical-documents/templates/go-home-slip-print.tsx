import { HsoHeader } from "@/components/medical-documents/templates/shared/hso-header"
import type { GoHomeSlipPayload, MedicalDocument } from "@/types/medicalDocument"
import { cn } from "@/lib/utils"

function formatDate(value: string | null | undefined) {
  if (!value) return "_______________"
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(parsed))
}

function medicationLine(
  med: { name: string; strength?: string | null; instructions?: string | null },
  index: number
) {
  const parts = [med.name, med.strength, med.instructions].filter(Boolean)
  return `${index + 1}. ${parts.join(" — ")}`
}

export function GoHomeSlipPrint({
  document,
  className,
}: {
  document: MedicalDocument
  className?: string
}) {
  const payload = document.payload as GoHomeSlipPayload
  const meds = payload.medications ?? []
  const lines = meds.length > 0 ? meds : Array.from({ length: 6 }, () => null)

  return (
    <article
      className={cn(
        "mx-auto max-w-[780px] bg-white p-8 font-serif text-[11px] leading-relaxed text-black",
        className
      )}
    >
      <HsoHeader formCode="NUD-ADM-HSO-F006 ver 2025" />

      <h1 className="mt-6 text-center text-lg font-bold tracking-wide uppercase">
        Go Home Slip
      </h1>

      <p className="mt-8 font-semibold">To Whom It May Concern:</p>

      <p className="mt-4 indent-8">
        This is to certify that{" "}
        <strong className="underline">{document.patient.fullName}</strong>, a
        student/patient of National University, is authorized to leave the
        university premises and go home on{" "}
        <strong>{formatDate(payload.releaseDate ?? document.issuedAt)}</strong>{" "}
        due to <strong>{payload.reason || "_________________________"}</strong>.
      </p>

      <div className="mt-8">
        <p className="font-semibold">Prescribed medication(s):</p>
        <div className="mt-3 space-y-3">
          {lines.slice(0, 6).map((med, index) => (
            <div
              key={index}
              className="min-h-[1.25rem] border-b border-neutral-400 pb-1"
            >
              {med ? medicationLine(med, index) : "\u00a0"}
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-16">
        <div className="w-64">
          <div className="h-10 border-b border-black" />
          <p className="mt-1 font-semibold">
            {document.doctorName ?? "School Physician"}
          </p>
          <p className="text-[10px]">Health Services Office</p>
        </div>
        <p className="mt-6 text-[10px] text-neutral-600">
          Document No. {document.documentNumber}
          {document.status === "voided" ? " · VOIDED" : ""}
        </p>
      </footer>
    </article>
  )
}
