"use server"

import { getStaffAccess } from "@/lib/auth/access"
import { canViewModule } from "@/lib/auth/permissions"
import { loadQueuePageData } from "@/features/queue/lib/load-queue-page.server"
import type { QueuePageBundle } from "@/features/queue/lib/queue-page-types"

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

    return { ok: true, data: await loadQueuePageData(access) }
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
