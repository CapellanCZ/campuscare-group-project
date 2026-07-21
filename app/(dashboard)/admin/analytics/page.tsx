import { RoleAnalyticsPage } from "@/features/dashboard/components/role-analytics-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default function AdminAnalyticsPage() {
  return (
    <RoleRouteGuard expectedRole="admin">
      <RoleAnalyticsPage role="admin" />
    </RoleRouteGuard>
  )
}
