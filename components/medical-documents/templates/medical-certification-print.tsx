import type { MedicalDocument } from "@/types/medicalDocument"
import type { MedicalCertificationPayload } from "@/types/medicalDocument"
import { cn } from "@/lib/utils"
import {
  HsoFormCheckbox,
  HsoFormFieldRow,
  HsoFormPhysicianFooter,
  HsoFormRule,
  HsoFormTreatmentLine,
  HsoFormVerificationFooter,
} from "@/components/medical-documents/templates/shared/hso-form-fields"
import { HsoHalfBondPage } from "@/components/medical-documents/templates/shared/hso-half-bond-page"

const VERIFICATION_EMAIL = "pcpielago@nu-dasma.edu.ph"
const VERIFICATION_PHONE = "09399199980"

function formatExamDate(value: string | null | undefined) {
  if (!value) return ""
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(parsed))
}

export function MedicalCertificationPrint({
  document,
  className,
}: {
  document: MedicalDocument
  className?: string
}) {
  const payload = document.payload as MedicalCertificationPayload
  const license =
    (document.payload.physicianLicenseNumber as string | undefined) ?? ""
  const status = payload.certificationStatus
  const treatmentSuggested =
    status === "special_placement" ? payload.treatmentSuggested ?? "" : ""
  const treatmentOptional =
    status === "special_placement" ? payload.treatmentOptional ?? "" : ""

  return (
    <HsoHalfBondPage
      formCode="NUD-ADM-HSO-F001"
      className={cn(className)}
      footer={
        <div className="flex items-end justify-between gap-8">
          <HsoFormVerificationFooter
            email={VERIFICATION_EMAIL}
            phone={VERIFICATION_PHONE}
          />
          <HsoFormPhysicianFooter
            doctorName={document.doctorName ?? ""}
            licenseNumber={license}
          />
        </div>
      }
    >
      <section className="space-y-1.5">
        <HsoFormFieldRow
          label="Patient's Name"
          value={document.patient.fullName}
        />
        <HsoFormFieldRow label="Purpose" value={document.purpose ?? ""} />
        <HsoFormFieldRow
          label="Date of Examination"
          value={formatExamDate(payload.dateOfExamination ?? document.issuedAt)}
        />
      </section>

      <HsoFormRule />

      <section className="mt-7 space-y-2">
        <p>
          I certify that I have examined and found the student to be physically
          fit/unfit for the school event.
        </p>

        <ul className="space-y-1.5">
          <li className="flex gap-1.5">
            <HsoFormCheckbox checked={status === "fit_all"} />
            <span>Physically fit for any activity of the University</span>
          </li>

          <li className="flex gap-1.5">
            <HsoFormCheckbox checked={status === "underdeveloped_fit"} />
            <span>
              Physically underdeveloped or with correctable defects, but
              otherwise fit for any school activity or event of the University
            </span>
          </li>

          <li className="flex gap-1.5">
            <HsoFormCheckbox checked={status === "special_placement"} />
            <span>
              Student but owing to certain impairments or conditions, requires
              special placement for school event/activity or limited duty in a
              specified or selected assignments requiring follow-up
              treatments/period evaluation
            </span>
          </li>

          <li className="list-none space-y-1">
            <HsoFormTreatmentLine
              label="Suggests treatment for"
              value={treatmentSuggested}
            />
            <HsoFormTreatmentLine
              label="Treatment optional for"
              value={treatmentOptional}
            />
          </li>

          <li className="flex gap-1.5">
            <HsoFormCheckbox checked={status === "unfit"} />
            <span>
              Unfit or unsafe for any type of university activity or event
            </span>
          </li>

          <li className="flex gap-1.5">
            <HsoFormCheckbox checked={status === "pending_clearance"} />
            <span>Pending Clearance</span>
          </li>
        </ul>

        {document.status === "voided" ? (
          <p className="pt-2 text-center text-[10pt] font-bold text-red-700 uppercase">
            Voided — {document.voidReason ?? "This document is no longer valid."}
          </p>
        ) : null}
      </section>
    </HsoHalfBondPage>
  )
}
