import { AdminModulePage } from "@/features/admin/components/admin-module-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

export default async function AdminAnnouncementsPage() {
  return (
    <RoleRouteGuard expectedRole="admin">
      <AdminModulePage module="announcements" />
    </RoleRouteGuard>
  )
}
