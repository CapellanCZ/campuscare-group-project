import "server-only"

import type { StaffAccess } from "@/lib/auth/types"
import {
  computeQueueStats,
  getQueueActivity,
  getNurseRecentlyServed,
  getRecentlyServed,
  getStationBoards,
  getTodayQueueTickets,
} from "@/lib/health/queue-queries"
import { stationForDesignation } from "@/lib/health/roles"
import type { QueuePageBundle } from "@/features/queue/lib/queue-page-types"

/** RSC + server-action shared loader for the queue page. */
export async function loadQueuePageData(
  access: StaffAccess
): Promise<QueuePageBundle> {
  const station = stationForDesignation(access.designation)
  const allTickets = await getTodayQueueTickets()
  const tickets =
    access.designation === "physician" || access.designation === "dentist"
      ? allTickets.filter((t) => t.station === station)
      : allTickets
  const isPhysician = access.designation === "physician"
  const isNurse = access.designation === "nurse"

  const [boards, recent, activity] = await Promise.all([
    isPhysician ? Promise.resolve([]) : getStationBoards(allTickets),
    isNurse
      ? getNurseRecentlyServed(8, tickets)
      : getRecentlyServed(8, tickets),
    isPhysician ? Promise.resolve([]) : getQueueActivity(8, allTickets),
  ])

  return {
    tickets,
    stats: computeQueueStats(tickets),
    boards,
    recent,
    activity,
  }
}
