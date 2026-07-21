import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"
import { NurseModulePage } from "@/features/nurse/components/nurse-module-page"

export default async function NurseReportsPage() {
  return (
    <RoleRouteGuard expectedRole="nurse">
      <NurseModulePage module="reports" />
    </RoleRouteGuard>
  )
}
