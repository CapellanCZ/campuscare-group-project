import {
  DetailRow,
  DetailSection,
  providerDisplay,
} from "@/components/queue/queue-ticket-detail-shared"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRequestDateTime } from "@/features/requests/lib/format"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import type { QueueTicketBookingDetail } from "@/lib/health/queue-ticket-detail-types"
import type { QueueTicketRow } from "@/lib/health/types"
import { stationLabel } from "@/lib/health/roles"

export function QueueTicketWalkInDetail({
  ticket,
  booking,
  loading,
}: {
  ticket: QueueTicketRow
  booking: QueueTicketBookingDetail | null
  loading: boolean
}) {
  const reason = displayConsultationLabel(
    booking?.reason || ticket.chiefComplaint || ticket.consultationType,
    booking?.reason || ticket.chiefComplaint
  )

  return (
    <div className="space-y-5">
      <DetailSection title="Patient">
        <DetailRow
          label="ID number"
          value={ticket.campusId || ticket.studentId}
        />
        <DetailRow
          label="Patient type"
          value={patientTypeLabel(ticket.patientType)}
        />
        <DetailRow label="Email" value={booking?.patientEmail} />
        <DetailRow label="Phone" value={booking?.patientPhone} />
      </DetailSection>

      <DetailSection title="Queue">
        <DetailRow
          label="Ticket"
          value={ticketLabel(ticket.queueNumber, ticket.ticketCode)}
        />
        <DetailRow label="Station" value={stationLabel(ticket.station)} />
        <DetailRow
          label="Checked in"
          value={
            ticket.checkedInAt
              ? formatRequestDateTime(ticket.checkedInAt)
              : "Not yet"
          }
        />
      </DetailSection>

      <DetailSection title="Visit">
        {loading && !booking ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <>
            <DetailRow label="Chief complaint" value={reason} />
            <DetailRow
              label="Provider"
              value={providerDisplay(booking, ticket.providerType)}
            />
            <DetailRow
              label="Notes"
              value={
                ticket.intakeNotes
                  ?.replace(/\[\[queue_ready\]\]/g, "")
                  .trim() || null
              }
            />
          </>
        )}
      </DetailSection>
    </div>
  )
}
