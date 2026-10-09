"use server"

import { getStaffAccess } from "@/lib/auth/access"
import { canViewModule } from "@/lib/auth/permissions"
import {
  computeQueueStats,
  getQueueActivity,
  getNurseRecentlyServed,
  getRecentlyServed,
  getStationBoards,
  getTodayQueueTickets,
} from "@/lib/health/queue-queries"
import { stationForDesignation } from "@/lib/health/roles"
import type {
  ActivityItem,
  QueueStats,
  QueueTicketRow,
  RecentlyServedItem,
  StationBoard,
} from "@/lib/health/types"

export type QueuePageBundle = {
  tickets: QueueTicketRow[]
  stats: QueueStats
  boards: StationBoard[]
  recent: RecentlyServedItem[]
  activity: ActivityItem[]
}

export type QueueActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function loadQueuePageAction(): Promise<
  QueueActionResult<QueuePageBundle>
> {
  try {
    const access = await getStaffAccess()
    if (!access?.hasClinicMembership) {
      return { ok: false, error: "Not signed in." }
    }
    if (!canViewModule(access.designation, "queue_management")) {
      return { ok: false, error: "You do not have access to the queue." }
    }

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
      ok: true,
      data: {
        tickets,
        stats: computeQueueStats(tickets),
        boards,
        recent,
        activity,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not load the queue. Please try again.",
    }
  }
}
