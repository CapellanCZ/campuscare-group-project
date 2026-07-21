import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { RoleSidebar } from "@/components/dashboard/role-sidebar"
import { RoleHeader } from "@/components/dashboard/role-header"
import type { WebRole } from "@/lib/auth/types"

type RoleShellProps = {
  role: WebRole
  staffName?: string
  staffEmail?: string
  children: React.ReactNode
}

const ROLE_LABEL: Record<WebRole, string> = {
  admin: "Administrator",
  nurse: "Nurse",
  physician: "Physician",
  dentist: "Dentist",
}

const PROFILE_HREF: Record<WebRole, string> = {
  admin: "/admin/settings",
  nurse: "/nurse/profile",
  physician: "/physician/profile",
  dentist: "/dentist/dashboard?module=profile",
}

export function RoleShell({
  role,
  staffName,
  staffEmail,
  children,
}: RoleShellProps) {
  return (
    <SidebarProvider className="relative h-svh">
      <RoleSidebar role={role} />
      <SidebarInset className="min-h-0 md:peer-data-[variant=inset]:ml-0">
        <RoleHeader
          role={role}
          staffName={staffName}
          staffEmail={staffEmail}
          staffRoleLabel={ROLE_LABEL[role]}
          profileHref={PROFILE_HREF[role]}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
