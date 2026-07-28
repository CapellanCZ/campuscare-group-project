import { cn } from "@/lib/utils"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { StaffAccessProvider } from "@/components/staff-access-provider"
import type { StaffAccess } from "@/lib/auth/types"

export function AppShell({
  children,
  access,
}: {
  children: React.ReactNode
  access: StaffAccess
}) {
  return (
    <StaffAccessProvider access={access}>
      <SidebarProvider className="[--app-wrapper-max-width:80rem]">
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div
            className={cn(
              "flex flex-1 flex-col p-4 md:p-6",
              "mx-auto w-full max-w-(--app-wrapper-max-width)"
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </StaffAccessProvider>
  )
}
