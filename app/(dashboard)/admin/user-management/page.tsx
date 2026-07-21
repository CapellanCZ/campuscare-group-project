import { UserManagementPage } from "@/features/admin/components/user-management-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

type AdminUserManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminUserManagementPage({
  searchParams,
}: AdminUserManagementPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <RoleRouteGuard expectedRole="admin">
      <UserManagementPage searchParams={resolvedSearchParams} />
    </RoleRouteGuard>
  )
}
