import { RequestsPage } from "@/components/requests/requests-demo-page"
import { requireStaffModule } from "@/lib/auth/require-module"

/**
 * Auth-only RSC — paint instantly from session cache; soft-revalidate on client.
 * Blocking DB here made every sidebar click wait on Supabase.
 */
export default async function StaffRequestsPage() {
  const access = await requireStaffModule("consultation_requests")

  return (
    <RequestsPage
      access={access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      }}
      initialStats={{
        pending: 0,
        confirmed: 0,
        waitlisted: 0,
        rescheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
        total: 0,
      }}
      hydrateFromCache
    />
  )
}
