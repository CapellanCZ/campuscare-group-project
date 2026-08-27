import { HsoHeader } from "@/components/medical-documents/templates/shared/hso-header"
import { NFG_CLEARANCE_STATUS_OPTIONS } from "@/features/medical-documents/lib/document-labels"
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
    <article
      className={cn(
        "mx-auto max-w-[780px] bg-white p-6 font-serif text-[10px] leading-snug text-black",
        className
      )}
    >
      <div className="rounded-sm bg-[#1e3a8a] px-4 py-2 text-center text-white">
        <HsoHeader showNfgLogo formCode="NFG Medical Clearance Form" />
        <h1 className="mt-2 text-sm font-bold uppercase tracking-wide">
          Medical Clearance — Nationalian Friendship Games
        </h1>
      </div>

      <section className="mt-4 rounded border border-neutral-300 p-3">
        <h2 className="mb-2 rounded bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase">
          Student Information
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
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
      </section>

      <section className="mt-3 rounded border border-neutral-300 p-3">
        <h2 className="mb-2 rounded bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase">
          Physical Examination
        </h2>
        <dl className="grid grid-cols-3 gap-2">
          <div>Height: {physical.height ?? "—"}</div>
          <div>Weight: {physical.weight ?? "—"}</div>
          <div>BP: {physical.bloodPressure ?? "—"}</div>
          <div>HR: {physical.heartRate ?? "—"}</div>
          <div>RR: {physical.respiratoryRate ?? "—"}</div>
          <div className="col-span-3">
            Other: {physical.otherFindings ?? "—"}
          </div>
        </dl>
      </section>

      <section className="mt-3 rounded border border-neutral-300 p-3">
        <h2 className="mb-2 rounded bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase">
          Medical History
        </h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(history).map(([key, value]) => (
            <span key={key} className="flex items-center gap-1">
              <span className="inline-block size-2.5 border border-black">
                {value ? <span className="block size-full bg-black" /> : null}
              </span>
              {key.replace(/([A-Z])/g, " $1")}
            </span>
          ))}
        </div>
        {payload.historyDetails ? (
          <p className="mt-2">Details: {payload.historyDetails}</p>
        ) : null}
      </section>

      <section className="mt-3 rounded border border-neutral-300 p-3">
        <h2 className="mb-2 rounded bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase">
          Clearance
        </h2>
        <ul className="space-y-1">
          {NFG_CLEARANCE_STATUS_OPTIONS.map((option) => (
            <li key={option.value} className="flex gap-2">
              <span className="inline-block size-2.5 border border-black">
                {payload.clearanceStatus === option.value ? (
                  <span className="block size-full bg-black" />
                ) : null}
              </span>
              {option.label}
            </li>
          ))}
        </ul>
        {payload.restrictions ? (
          <p className="mt-2">Restrictions: {payload.restrictions}</p>
        ) : null}
        {payload.recommendations ? (
          <p className="mt-1">Recommendations: {payload.recommendations}</p>
        ) : null}
      </section>

      <footer className="mt-6 border-t pt-4">
        <p className="font-semibold">{document.doctorName ?? "Physician"}</p>
        <p>Licensed No. {license || "_______________"}</p>
        <p className="mt-2 text-neutral-600">
          Document No. {document.documentNumber}
        </p>
      </footer>
    </article>
  )
}
