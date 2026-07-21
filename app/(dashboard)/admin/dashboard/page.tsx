import { AdminModulePage } from "@/features/admin/components/admin-module-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default async function AdminDashboardPage() {
  return (
    <RoleRouteGuard expectedRole="admin">
      <AdminModulePage module="dashboard" />
    </RoleRouteGuard>
  )
}
