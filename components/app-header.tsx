"use client"

import { usePathname } from "next/navigation"
import { IconSettings } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { AppBreadcrumbs } from "@/components/app-breadcrumbs"
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger"
import { DecorIcon } from "@/components/decor-icon"
import { resolveActiveNav } from "@/components/app-shared"
import { HeaderNotifications } from "@/components/header-notifications"
import { HeaderSearch } from "@/components/header-search"
import { NavUser } from "@/components/nav-user"
import { OnBreakControl } from "@/components/availability/on-break-control"
import { useOptionalStaffAccess } from "@/components/staff-access-provider"
import { stripStaffBasePath } from "@/lib/auth/home-path"

export function AppHeader() {
  const pathname = usePathname()
  const access = useOptionalStaffAccess()
  const activeItem = resolveActiveNav(pathname, access?.primaryRole)
  const relative = stripStaffBasePath(pathname)
  const page =
    activeItem ??
    (relative === "/settings" || relative.startsWith("/settings/")
      ? { title: "Settings", icon: <IconSettings className="size-3.5" /> }
      : undefined)

  const role = access?.primaryRole
  const showClinicBreak = role === "nurse" || role === "admin"
  const showStaffBreak =
    role === "physician" || role === "dentist" || role === "nurse"

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6",
        "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50"
      )}
    >
      <DecorIcon className="hidden md:block" position="bottom-left" />
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs page={page} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {showClinicBreak ? (
          <OnBreakControl mode="clinic" role={role} />
        ) : null}
        {showStaffBreak ? (
          <OnBreakControl mode="staff" role={role} />
        ) : null}
        <HeaderSearch />
        <HeaderNotifications />
        <Separator
          className="h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <NavUser />
      </div>
    </header>
  )
}
