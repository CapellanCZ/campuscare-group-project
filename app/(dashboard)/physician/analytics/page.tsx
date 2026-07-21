import { RoleAnalyticsPage } from "@/features/dashboard/components/role-analytics-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default function PhysicianAnalyticsPage() {
  return (
    <RoleRouteGuard expectedRole="physician">
      <RoleAnalyticsPage role="physician" />
    </RoleRouteGuard>
  )
}
