import { RoleAnalyticsPage } from "@/features/dashboard/components/role-analytics-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default function DentistAnalyticsPage() {
  return (
    <RoleRouteGuard expectedRole="dentist">
      <RoleAnalyticsPage role="dentist" />
    </RoleRouteGuard>
  )
}
