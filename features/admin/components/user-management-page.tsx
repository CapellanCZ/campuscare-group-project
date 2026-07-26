import { listStaffUsers } from "@/features/admin/actions/user-management"
import { UserDirectoryPanel } from "@/features/admin/components/user-directory-panel"
import {
  DIRECTORY_CONFIG,
  type UserDirectory,
} from "@/features/admin/lib/user-directory-config"

type UserManagementPageProps = {
  directory: UserDirectory
}

export async function UserManagementPage({
  directory,
}: UserManagementPageProps) {
  const config = DIRECTORY_CONFIG[directory]
  const listResult = await listStaffUsers({
    roles: [...config.roles],
  })

  return (
    <UserDirectoryPanel
      directory={directory}
      config={config}
      initialUsers={listResult.ok ? listResult.users : []}
      loadError={listResult.ok ? undefined : listResult.error}
    />
  )
}
