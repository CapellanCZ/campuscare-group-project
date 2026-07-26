import { PatientsPage } from "@/features/admin/components/patients-page"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPatientsUnderUserManagementPage({
  searchParams,
}: PageProps) {
  const resolved = await searchParams
  return <PatientsPage searchParams={resolved} />
}
