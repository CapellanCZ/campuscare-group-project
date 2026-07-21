import { RoleDashboardContent } from "@/features/dashboard/components/role-dashboard-content"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"
import type { WebRole } from "@/lib/auth/types"

type RoleDashboardPageProps = {
  expectedRole: WebRole
}

export async function RoleDashboardPage({ expectedRole }: RoleDashboardPageProps) {
  return (
    <RoleRouteGuard expectedRole={expectedRole}>
      <RoleDashboardContent role={expectedRole} />
    </RoleRouteGuard>
  )
}
