import type { MedicalCertificateStatus } from "@/types/medicalCertificate"

const manilaDateTime = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const manilaDate = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "short",
  day: "2-digit",
})

export function formatCertificateDateTime(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return manilaDateTime.format(date)
}

export function formatCertificateDate(value: string | null | undefined) {
  if (!value) return "—"
  // Date-only strings should not shift by timezone when possible.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number)
    const local = new Date(year, month - 1, day)
    return manilaDate.format(local)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return manilaDate.format(date)
}

export function certificateStatusLabel(status: MedicalCertificateStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
