import { RoleAnalyticsPage } from "@/features/dashboard/components/role-analytics-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default function NurseAnalyticsPage() {
  return (
    <RoleRouteGuard expectedRole="nurse">
      <RoleAnalyticsPage role="nurse" />
    </RoleRouteGuard>
  )
}
