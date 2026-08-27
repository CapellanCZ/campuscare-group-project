import { cn } from "@/lib/utils"

export function HsoFormCheckbox({ checked }: { checked: boolean }) {
  return (
    <span className="shrink-0 font-normal" aria-hidden>
      [{checked ? "X" : " "}]
    </span>
  )
}

export function HsoFormFieldRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex w-full min-w-0 items-end">
      <span className="shrink-0 font-bold uppercase">{label}: </span>
      <span
        className={cn(
          "min-w-0 flex-1 border-b border-black pb-px leading-none",
          valueClassName
        )}
      >
        {value || "\u00a0"}
      </span>
    </div>
  )
}

export function HsoFormTreatmentLine({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <p className="pl-[22px]">
      <span>{label} </span>
      <span className="inline-block min-w-[11rem] border-b border-black pb-px align-bottom sm:min-w-[14rem]">
        {value || "\u00a0"}
      </span>
    </p>
  )
}

export function HsoFormRule() {
  return (
    <div
      className="my-3 border-b border-black print:my-1"
      aria-hidden
    />
  )
}

export function HsoFormPhysicianFooter({
  doctorName,
  licenseNumber,
  title = "University Physician, NU Dasmariñas",
}: {
  doctorName: string
  licenseNumber: string
  title?: string
}) {
  return (
    <div className="shrink-0 text-left text-[10pt] leading-snug">
      <p>
        Examining Physician:{" "}
        <span className="font-bold">{doctorName}</span>
      </p>
      <p>License Number: {licenseNumber}</p>
      <p>{title}</p>
    </div>
  )
}

export function HsoFormVerificationFooter({
  email,
  phone,
}: {
  email: string
  phone: string
}) {
  return (
    <p className="max-w-[58%] text-[10pt] leading-snug">
      Email: <span className="font-bold">{email}</span> or call{" "}
      <span className="font-bold">{phone}</span> to verify validity
    </p>
  )
}
