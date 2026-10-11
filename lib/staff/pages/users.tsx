import { requireStaffModule } from "@/lib/auth/require-module"

export async function StaffUsersPage() {
  await requireStaffModule("user_management")
  const { UserManagementPage } = await import(
    "@/features/admin/components/user-management-page"
  )
  return <UserManagementPage directory="staff" />
}
