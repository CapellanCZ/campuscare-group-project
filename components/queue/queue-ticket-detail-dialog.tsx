"use client"

import { useEffect, useState } from "react"

import { QueueTicketBookedDetail } from "@/components/queue/queue-ticket-booked-detail"
import { sourceKindLabel } from "@/components/queue/queue-ticket-detail-shared"
import { QueueTicketWalkInDetail } from "@/components/queue/queue-ticket-walk-in-detail"
import { WaitStatusBadge } from "@/components/queue/wait-status-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { patientTypeLabel, ticketLabel } from "@/lib/health/mappers"
import { actionFetchQueueTicketBookingDetail } from "@/lib/health/queue-server-actions"
import {
  isWalkInTicketDetail,
  type QueueTicketBookingDetail,
} from "@/lib/health/queue-ticket-detail-types"
import type { QueueTicketRow } from "@/lib/health/types"

export function QueueTicketDetailDialog({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: QueueTicketRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [booking, setBooking] = useState<QueueTicketBookingDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !ticket) {
      setBooking(null)
      return
    }

    let cancelled = false
    setLoading(true)
    void actionFetchQueueTicketBookingDetail({
      ticketId: ticket.ticketId,
      appointmentId: ticket.appointmentId,
      consultationRequestId: ticket.consultationRequestId,
      consultationId: ticket.consultationId,
      appointmentStartsAt: ticket.appointmentStartsAt,
      chiefComplaint: ticket.chiefComplaint,
      consultationType: ticket.consultationType,
      service: ticket.service,
      providerType: ticket.providerType,
      patientId: ticket.patientId,
      campusId: ticket.campusId,
      studentId: ticket.studentId,
    }).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (result.ok) setBooking(result.data)
    })

    return () => {
      cancelled = true
    }
  }, [open, ticket])

  if (!ticket) return null

  const walkIn = isWalkInTicketDetail(ticket, booking)
  const visitKind = walkIn ? "Walk-in visit" : "Booked visit"
  const kindLabel = sourceKindLabel(booking?.source, walkIn)
  const ticketNo = ticketLabel(ticket.queueNumber, ticket.ticketCode)
  const patientType = patientTypeLabel(ticket.patientType)
  const metaBits = [ticketNo, patientType, kindLabel].filter(
    (bit): bit is string => Boolean(bit && bit !== "—")
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(90vh,760px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="shrink-0 gap-0 border-b px-6 py-5 text-left">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {visitKind}
            </p>
            <WaitStatusBadge
              status={ticket.status}
              waitMinutes={ticket.estimatedWaitMinutes}
            />
          </div>

          <DialogTitle className="mt-2.5 text-xl leading-snug font-semibold tracking-tight text-pretty">
            {ticket.patientName}
          </DialogTitle>

          <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
            {metaBits.join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {walkIn ? (
            <QueueTicketWalkInDetail
              ticket={ticket}
              booking={booking}
              loading={loading}
            />
          ) : (
            <QueueTicketBookedDetail
              ticket={ticket}
              booking={booking}
              loading={loading}
            />
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
