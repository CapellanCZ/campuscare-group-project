import { HsoHeader } from "@/components/medical-documents/templates/shared/hso-header"
import {
  HsoFormCheckboxMark,
  HsoFullPageDocument,
  HsoFullPageSection,
} from "@/components/medical-documents/templates/shared/hso-full-page"
import { NFG_CLEARANCE_STATUS_OPTIONS } from "@/features/medical-documents/lib/document-labels"
import { nfgMedicalHistoryLabel } from "@/features/medical-documents/lib/nfg-history-labels"
import type { MedicalDocument, NfgClearancePayload } from "@/types/medicalDocument"
import { cn } from "@/lib/utils"

export function NfgClearancePrint({
  document,
  className,
}: {
  document: MedicalDocument
  className?: string
}) {
  const payload = document.payload as NfgClearancePayload
  const physical = payload.physical ?? {}
  const history = payload.medicalHistory ?? {}
  const license =
    (document.payload.physicianLicenseNumber as string | undefined) ?? ""

  return (
    <HsoFullPageDocument className={cn("py-5", className)}>
      <div className="rounded-sm bg-[#1e3a8a] px-4 py-3 text-white">
        <HsoHeader showNfgLogo formCode="NFG Medical Clearance Form" inverted />
        <h1 className="mt-2 text-center text-sm font-bold tracking-wide uppercase">
          Medical Clearance — Nationalian Friendship Games
        </h1>
      </div>

      <HsoFullPageSection title="Student Information">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          <div>
            <dt className="text-neutral-600">Name</dt>
            <dd className="font-semibold">{document.patient.fullName}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Student ID</dt>
            <dd>{document.patient.studentId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Date of Birth</dt>
            <dd>{payload.dateOfBirth ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Gender</dt>
            <dd>{payload.gender ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Sport</dt>
            <dd>{payload.sport ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Campus / Course</dt>
            <dd>{payload.campus ?? "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-neutral-600">Emergency Contact</dt>
            <dd>{payload.emergencyContact ?? "—"}</dd>
          </div>
        </dl>
      </HsoFullPageSection>

      <HsoFullPageSection title="Physical Examination">
        <dl className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <span className="text-neutral-600">Height:</span>{" "}
            {physical.height ?? "—"}
          </div>
          <div>
            <span className="text-neutral-600">Weight:</span>{" "}
            {physical.weight ?? "—"}
          </div>
          <div>
            <span className="text-neutral-600">BP:</span>{" "}
            {physical.bloodPressure ?? "—"}
          </div>
          <div>
            <span className="text-neutral-600">HR:</span>{" "}
            {physical.heartRate ?? "—"}
          </div>
          <div>
            <span className="text-neutral-600">RR:</span>{" "}
            {physical.respiratoryRate ?? "—"}
          </div>
          <div className="col-span-3">
            <span className="text-neutral-600">Other findings:</span>{" "}
            {physical.otherFindings ?? "—"}
          </div>
        </dl>
      </HsoFullPageSection>

      <HsoFullPageSection title="Medical History">
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(history).map(([key, value]) => (
            <span key={key} className="flex items-center gap-2 text-[11px]">
              <HsoFormCheckboxMark checked={Boolean(value)} />
              {nfgMedicalHistoryLabel(key)}
            </span>
          ))}
        </div>
        {payload.historyDetails ? (
          <p className="mt-3 border-t border-neutral-200 pt-2 text-[11px]">
            <span className="font-semibold">Additional details:</span>{" "}
            {payload.historyDetails}
          </p>
        ) : null}
      </HsoFullPageSection>

      <HsoFullPageSection title="Clearance">
        <ul className="space-y-2 text-[11px]">
          {NFG_CLEARANCE_STATUS_OPTIONS.map((option) => (
            <li key={option.value} className="flex items-start gap-2">
              <HsoFormCheckboxMark
                checked={payload.clearanceStatus === option.value}
              />
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
        {payload.restrictions ? (
          <p className="mt-3 border-t border-neutral-200 pt-2 text-[11px]">
            <span className="font-semibold">Restrictions:</span>{" "}
            {payload.restrictions}
          </p>
        ) : null}
        {payload.recommendations ? (
          <p className="mt-2 text-[11px]">
            <span className="font-semibold">Recommendations:</span>{" "}
            {payload.recommendations}
          </p>
        ) : null}
      </HsoFullPageSection>

      <footer className="mt-6 border-t border-neutral-200 pt-4 text-[11px]">
        <p className="font-semibold">{document.doctorName ?? "Physician"}</p>
        <p className="mt-1 text-neutral-600">
          Licensed No. {license || "_______________"}
        </p>
        <p className="mt-2 text-[10px] text-neutral-500">
          Document No. {document.documentNumber}
        </p>
      </footer>
    </HsoFullPageDocument>
  )
}
