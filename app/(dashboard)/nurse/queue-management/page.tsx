import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"
import { NurseModulePage } from "@/features/nurse/components/nurse-module-page"

export default async function NurseQueueManagementPage() {
  return (
    <RoleRouteGuard expectedRole="nurse">
      <NurseModulePage module="queue-management" />
    </RoleRouteGuard>
  )
}
