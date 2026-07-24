import { UserManagementPage } from "@/features/admin/components/user-management-page"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminAdminsPage({ searchParams }: PageProps) {
  const resolved = await searchParams
  return <UserManagementPage directory="admins" searchParams={resolved} />
}
