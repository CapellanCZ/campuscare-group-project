import "server-only"

import type { StaffAccess } from "@/lib/auth/types"
import {
  getAppointmentRequests,
  getAppointmentRequestStats,
} from "@/services/appointment-requests"
import { NURSE_REQUEST_TAB_STATUSES } from "@/types/appointmentRequest"
import type { RequestsPageBundle } from "@/features/requests/lib/requests-page-types"

/** RSC + server-action shared loader (list + stats in parallel). */
export async function loadRequestsPageData(
  access: StaffAccess
): Promise<RequestsPageBundle> {
  const [list, stats] = await Promise.all([
    getAppointmentRequests({
      query: "",
      status: "all",
      statuses:
        access.designation === "nurse" ? NURSE_REQUEST_TAB_STATUSES : undefined,
      page: 1,
      pageSize: 50,
    }),
    getAppointmentRequestStats(),
  ])
  return { list, stats }
}
