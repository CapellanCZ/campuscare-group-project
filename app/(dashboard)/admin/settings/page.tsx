import { AdminModulePage } from "@/features/admin/components/admin-module-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default async function AdminSettingsPage() {
  return (
    <RoleRouteGuard expectedRole="admin">
      <AdminModulePage module="settings" />
    </RoleRouteGuard>
  )
}
