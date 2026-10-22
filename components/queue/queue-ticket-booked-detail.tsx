import {
  DetailRow,
  DetailSection,
  providerDisplay,
} from "@/components/queue/queue-ticket-detail-shared"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatRequestDate,
  formatRequestDateTime,
  formatRequestTime12h,
} from "@/features/requests/lib/format"
import { displayConsultationLabel } from "@/lib/health/consultation-display"
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import type { QueueTicketBookingDetail } from "@/lib/health/queue-ticket-detail-types"
import type { QueueTicketRow } from "@/lib/health/types"
import { stationLabel } from "@/lib/health/roles"

export function QueueTicketBookedDetail({
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
  const scheduledAt =
    booking?.scheduledStartsAt ?? ticket.appointmentStartsAt
  const preferredTime = booking?.preferredTime
    ? formatRequestTime12h(booking.preferredTime) || booking.preferredTime
    : null

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

      <DetailSection title="Booking">
        {loading && !booking ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <>
            <DetailRow label="Service / reason" value={reason} />
            <DetailRow
              label="Provider"
              value={providerDisplay(booking, ticket.providerType)}
            />
            <DetailRow
              label="Scheduled"
              value={
                scheduledAt ? formatRequestDateTime(scheduledAt) : null
              }
            />
            <DetailRow
              label="Preferred date"
              value={
                booking?.preferredDate
                  ? formatRequestDate(booking.preferredDate)
                  : null
              }
            />
            <DetailRow label="Preferred time" value={preferredTime} />
            <DetailRow
              label="Request status"
              value={booking?.requestStatus}
            />
            <DetailRow
              label="Appointment status"
              value={booking?.appointmentStatus}
            />
            <DetailRow label="Assigned doctor" value={booking?.doctorName} />
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
