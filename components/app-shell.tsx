"use client"

import { cn } from "@/lib/utils"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { BreakModeOverlay } from "@/components/availability/on-break-control"
import {
  BreakModeProvider,
  useOptionalBreakMode,
} from "@/components/availability/break-mode-context"
import { DutyStatusProvider } from "@/components/availability/duty-status-control"
import { StaffRealtimeShell } from "@/components/staff-realtime-shell"
import { StaffAccessProvider } from "@/components/staff-access-provider"
import { StaffThemeController } from "@/components/staff-theme-provider"
import type { StaffAccess } from "@/lib/auth/types"
import type { ThemePreference } from "@/lib/theme/staff-theme-storage"
import { breakModeForRole } from "@/lib/availability/break-mode"

function ShellBody({
  children,
  isAdmin,
}: {
  children: React.ReactNode
  isAdmin: boolean
}) {
  const breakMode = useOptionalBreakMode()
  const locked = Boolean(breakMode?.active)

  return (
    <SidebarProvider className="[--app-wrapper-max-width:100rem]">
      <div
        className={cn(
          "contents",
          locked && "pointer-events-none select-none [&_*]:pointer-events-none"
        )}
        aria-hidden={locked || undefined}
      >
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div
            className={cn(
              "flex flex-1 flex-col p-4 md:p-6",
              "mx-auto w-full max-w-(--app-wrapper-max-width)",
              isAdmin && "bg-muted/30"
            )}
          >
            {children}
          </div>
        </SidebarInset>
      </div>
      <BreakModeOverlay />
    </SidebarProvider>
  )
}

export function AppShell({
  children,
  access,
  initialTheme,
}: {
  children: React.ReactNode
  access: StaffAccess
  initialTheme: ThemePreference
}) {
  const role = access.primaryRole
  const breakMode = breakModeForRole(role)

  return (
    <StaffAccessProvider access={access}>
      <StaffThemeController userId={access.userId} initialTheme={initialTheme}>
        <BreakModeProvider mode={breakMode} role={role}>
          <DutyStatusProvider role={role}>
            <StaffRealtimeShell />
            <ShellBody isAdmin={role === "admin"}>{children}</ShellBody>
          </DutyStatusProvider>
        </BreakModeProvider>
      </StaffThemeController>
    </StaffAccessProvider>
  )
}
