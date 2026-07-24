import { RoleDashboardContent } from "@/features/dashboard/components/role-dashboard-content"
import type { WebRole } from "@/lib/auth/types"

type RoleDashboardPageProps = {
  expectedRole: WebRole
}

export function RoleDashboardPage({ expectedRole }: RoleDashboardPageProps) {
  return <RoleDashboardContent role={expectedRole} />
}
