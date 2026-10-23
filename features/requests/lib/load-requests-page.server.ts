import "server-only"

import type { StaffAccess } from "@/lib/auth/types"
import {
  getAppointmentRequests,
  getAppointmentRequestStats,
  getRecentlyApprovedRequests,
} from "@/services/appointment-requests"
import { RECENTLY_APPROVED_LIMIT } from "@/features/requests/lib/recently-approved"
import { NURSE_REQUEST_TAB_STATUSES } from "@/types/appointmentRequest"
import type { RequestsPageBundle } from "@/features/requests/lib/requests-page-types"

const QUEUE_PAGE_SIZE = 100

/** RSC + server-action shared loader (list + stats + recent approved). */
export async function loadRequestsPageData(
  access: StaffAccess
): Promise<RequestsPageBundle> {
  const [list, stats, recentApproved] = await Promise.all([
    getAppointmentRequests({
      query: "",
      status: "all",
      statuses:
        access.designation === "nurse" ? NURSE_REQUEST_TAB_STATUSES : undefined,
      page: 1,
      pageSize: QUEUE_PAGE_SIZE,
    }),
    getAppointmentRequestStats(),
    getRecentlyApprovedRequests(RECENTLY_APPROVED_LIMIT),
  ])
  return { list, stats, recentApproved }
}
