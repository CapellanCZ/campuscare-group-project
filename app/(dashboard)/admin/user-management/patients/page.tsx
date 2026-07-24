import { PatientsPage } from "@/features/admin/components/patients-page"
import { RoleRouteGuard } from "@/features/dashboard/components/role-route-guard"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPatientsUnderUserManagementPage({
  searchParams,
}: PageProps) {
  const resolved = await searchParams
  return (
    <RoleRouteGuard expectedRole="admin">
      <PatientsPage searchParams={resolved} />
    </RoleRouteGuard>
  )
}
