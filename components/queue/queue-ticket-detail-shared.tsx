import type { QueueTicketBookingDetail } from "@/lib/health/queue-ticket-detail-types"

export function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-b border-border/50 py-2.5 last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-words text-foreground">
        {value == null || value === "" ? "—" : value}
      </dd>
    </div>
  )
}

export function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h3>
      <dl className="divide-y divide-border/50">{children}</dl>
    </section>
  )
}

export function providerDisplay(
  booking: QueueTicketBookingDetail | null,
  ticketProviderType: string | null
): string | null {
  const raw = booking?.providerType ?? ticketProviderType
  if (!raw) return null
  if (raw === "dentist") return "Dentist"
  if (raw === "physician") return "Physician"
  if (raw === "nurse") return "Nurse"
  return raw
}

export function sourceKindLabel(
  source: QueueTicketBookingDetail["source"] | undefined,
  isWalkIn: boolean
): string | null {
  if (isWalkIn || source === "walk_in") return "Walk-in"
  if (source === "appointment") return "Appointment"
  if (source === "consultation_request") return "Request"
  // Avoid a redundant "Queue ticket" label while booking detail is loading.
  return null
}
