import { HsoHeader } from "@/components/medical-documents/templates/shared/hso-header"
import {
  HsoFullPageDocument,
  HsoFullPageTitle,
} from "@/components/medical-documents/templates/shared/hso-full-page"
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
    <HsoFullPageDocument className={cn(className)}>
      <HsoHeader formCode="NUD-ADM-HSO-F006 ver 2025" />
      <HsoFullPageTitle>Go Home Slip</HsoFullPageTitle>

      <p className="mt-6 font-semibold">To Whom It May Concern:</p>

      <p className="mt-4 indent-8 leading-7">
        This is to certify that{" "}
        <strong className="underline decoration-neutral-400 underline-offset-2">
          {document.patient.fullName}
        </strong>
        , a student/patient of National University, is authorized to leave the
        university premises and go home on{" "}
        <strong>{formatDate(payload.releaseDate ?? document.issuedAt)}</strong>{" "}
        due to{" "}
        <strong>{payload.reason || "_________________________"}</strong>.
      </p>

      <div className="mt-8">
        <p className="text-[10px] font-bold tracking-wide uppercase">
          Prescribed medication(s)
        </p>
        <div className="mt-3 space-y-2.5">
          {lines.slice(0, 6).map((med, index) => (
            <div
              key={index}
              className="min-h-[1.35rem] border-b border-neutral-400 pb-1 text-[11px]"
            >
              {med ? medicationLine(med, index) : "\u00a0"}
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-14 border-t border-neutral-200 pt-6">
        <div className="w-64">
          <div className="h-10 border-b border-black" />
          <p className="mt-1.5 font-semibold">
            {document.doctorName ?? "School Physician"}
          </p>
          <p className="text-[10px] text-neutral-600">Health Services Office</p>
        </div>
        <p className="mt-5 text-[10px] text-neutral-500">
          Document No. {document.documentNumber}
          {document.status === "voided" ? " · VOIDED" : ""}
        </p>
      </footer>
    </HsoFullPageDocument>
  )
}
