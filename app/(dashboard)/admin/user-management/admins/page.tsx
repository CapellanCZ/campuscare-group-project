import { UserManagementPage } from "@/features/admin/components/user-management-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminAdminsPage({ searchParams }: PageProps) {
  const resolved = await searchParams
  return (
    <RoleRouteGuard expectedRole="admin">
      <UserManagementPage directory="admins" searchParams={resolved} />
    </RoleRouteGuard>
  )
}
