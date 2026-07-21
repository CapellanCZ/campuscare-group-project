import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { RoleSidebar } from "@/components/dashboard/role-sidebar"
import { RoleHeader } from "@/components/dashboard/role-header"
import type { WebRole } from "@/lib/auth/types"

type RoleShellProps = {
  role: WebRole
  children: React.ReactNode
}

export function RoleShell({ role, children }: RoleShellProps) {
  return (
    <SidebarProvider className="relative h-svh">
      <RoleSidebar role={role} />
      <SidebarInset className="md:peer-data-[variant=inset]:ml-0">
        <RoleHeader />
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
