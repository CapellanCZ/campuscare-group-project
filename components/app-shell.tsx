"use client"

import { useMemo } from "react"

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
import {
  NavPendingProvider,
  useOptionalNavPending,
} from "@/components/dashboard/nav-pending"
import { StaffRealtimeShell } from "@/components/staff-realtime-shell"
import { StaffAccessProvider } from "@/components/staff-access-provider"
import { StaffThemeController } from "@/components/staff-theme-provider"
import type { StaffAccess } from "@/lib/auth/types"
import type { ThemePreference } from "@/lib/theme/staff-theme-storage"
import { breakModeForRole } from "@/lib/availability/break-mode"
import {
  buildStaffFooterNav,
  buildStaffNavGroups,
  filterNavGroupsForRole,
  flattenNavItems,
} from "@/lib/navigation/staff-nav"

function ShellBody({
  children,
  isAdmin,
}: {
  children: React.ReactNode
  isAdmin: boolean
}) {
  const breakMode = useOptionalBreakMode()
  const navPending = useOptionalNavPending()
  const locked = Boolean(breakMode?.active)
  const navigating = Boolean(navPending?.isPending)

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
        <SidebarInset className="min-w-0">
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 z-40 h-1 overflow-hidden bg-primary/15 transition-opacity",
              navigating ? "opacity-100" : "opacity-0"
            )}
            aria-hidden
          >
            <div className="h-full w-2/5 animate-nav-progress bg-primary" />
          </div>
          <AppHeader />
          <div
            className={cn(
              "relative flex min-w-0 flex-1 flex-col overflow-x-clip p-3 pb-8 sm:p-4 sm:pb-6 md:p-6",
              "mx-auto w-full max-w-(--app-wrapper-max-width)",
              isAdmin && "bg-muted/30"
            )}
            aria-busy={navigating || undefined}
          >
            {/* Keep current page mounted during nav. No full-page skeleton —
                only in-page data regions skeletonize while Supabase loads. */}
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
  const prefetchHrefs = useMemo(() => {
    const groups = filterNavGroupsForRole(role, buildStaffNavGroups(role))
    const footer = buildStaffFooterNav(role)
    return flattenNavItems(groups, footer).map((item) => item.path)
  }, [role])

  return (
    <StaffAccessProvider access={access}>
      <StaffThemeController userId={access.userId} initialTheme={initialTheme}>
        <BreakModeProvider mode={breakMode} role={role}>
          <DutyStatusProvider role={role}>
            <NavPendingProvider prefetchHrefs={prefetchHrefs}>
              <StaffRealtimeShell />
              <ShellBody isAdmin={role === "admin"}>{children}</ShellBody>
            </NavPendingProvider>
          </DutyStatusProvider>
        </BreakModeProvider>
      </StaffThemeController>
    </StaffAccessProvider>
  )
}
