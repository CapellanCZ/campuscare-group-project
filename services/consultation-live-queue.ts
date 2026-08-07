import "server-only"

import {
  THREE_AHEAD_THRESHOLD,
  recommendApproachSoon,
  recommendComeEarly,
  recommendationMessageKeys,
} from "@/lib/health/consultation-workflow"
import { createClient } from "@/lib/supabase/server"

export type LiveQueueRecommendation = {
  queueNumber: number | null
  patientsAhead: number
  recommendApproachSoon: boolean
  recommendComeEarly: boolean
  threeAhead: boolean
  ticketStatus: string | null
  requestStatus: string | null
  messageKeys: string[]
}

/** Compute live-queue recommendation for a reserved ticket on its service day. */
export async function getLiveQueueRecommendation(input: {
  ticketId?: string | null
  requestId?: string | null
}): Promise<LiveQueueRecommendation | null> {
  const supabase = await createClient()

  let ticketId = input.ticketId ?? null
  let requestStatus: string | null = null
  let queueNumber: number | null = null

  if (input.requestId) {
    const { data: req } = await supabase
      .from("consultation_requests")
      .select("status, queue_ticket_id, queue_number")
      .eq("id", input.requestId)
      .maybeSingle()
    if (!req) return null
    requestStatus = req.status
    ticketId = ticketId ?? (req.queue_ticket_id as string | null)
    queueNumber = (req.queue_number as number | null) ?? null
  }

  if (!ticketId) {
    return {
      queueNumber,
      patientsAhead: Number.POSITIVE_INFINITY,
      recommendApproachSoon: false,
      recommendComeEarly: recommendComeEarly(queueNumber),
      threeAhead: false,
      ticketStatus: null,
      requestStatus,
      messageKeys: recommendationMessageKeys({ queueNumber }),
    }
  }

  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id, status, queue_number, queue_position, station, service_date")
    .eq("id", ticketId)
    .maybeSingle()

  if (!ticket) return null
  queueNumber = (ticket.queue_number as number | null) ?? queueNumber

  const { data: aheadRows } = await supabase
    .from("health_queue_tickets")
    .select("id")
    .eq("service_date", ticket.service_date)
    .eq("station", ticket.station)
    .in("status", ["waiting", "called", "ongoing"])
    .lt("queue_position", ticket.queue_position ?? 0)

  const patientsAhead = aheadRows?.length ?? 0
  const called = ticket.status === "called"
  const threeAhead = patientsAhead <= THREE_AHEAD_THRESHOLD && !called

  return {
    queueNumber,
    patientsAhead,
    recommendApproachSoon: recommendApproachSoon(patientsAhead),
    recommendComeEarly: recommendComeEarly(queueNumber),
    threeAhead,
    ticketStatus: ticket.status as string,
    requestStatus,
    messageKeys: recommendationMessageKeys({
      queueNumber,
      patientsAhead,
      threeAhead,
      called,
    }),
  }
}
