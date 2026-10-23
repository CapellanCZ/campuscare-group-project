"use server"

import { getPublicQueueSnapshot } from "@/lib/health/queue-queries"
import type { BreakStatus } from "@/lib/availability/types"
import type { RecentlyServedItem, StationBoard } from "@/lib/health/types"

export type PublicQueueSnapshot = {
  boards: StationBoard[]
  recentlyServed: RecentlyServedItem[]
  totalWaiting: number
  clinicBreak: BreakStatus
}

export type PublicQueueActionResult =
  | { ok: true; data: PublicQueueSnapshot }
  | { ok: false; error: string }

/** Soft-refresh for the TV display — local state stays source of truth. */
export async function fetchPublicQueueSnapshotAction(): Promise<PublicQueueActionResult> {
  try {
    const snapshot = await getPublicQueueSnapshot()
    return {
      ok: true,
      data: {
        boards: snapshot.boards,
        recentlyServed: snapshot.recentlyServed,
        totalWaiting: snapshot.totalWaiting,
        clinicBreak: snapshot.clinicBreak,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not refresh the queue display.",
    }
  }
}
