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
import { NavUser } from "@/components/nav-user"
import { OnBreakControl } from "@/components/availability/on-break-control"
import { DutyStatusControl } from "@/components/availability/duty-status-control"
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
      ? { title: "Profile and Settings", icon: <IconSettings className="size-3.5" /> }
      : undefined)

  const role = access?.primaryRole

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:px-4 md:px-6",
        "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50"
      )}
    >
      <DecorIcon className="hidden md:block" position="bottom-left" />
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-1 hidden h-4 data-[orientation=vertical]:self-center sm:mr-2 sm:block"
          orientation="vertical"
        />
        <div className="min-w-0 truncate">
          <AppBreadcrumbs page={page} />
        </div>
      </div>
      <div className="flex max-w-[58%] shrink-0 items-center justify-end gap-1.5 overflow-x-auto sm:max-w-none sm:gap-3">
        {role ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DutyStatusControl compact />
            <OnBreakControl />
          </div>
        ) : null}
        <HeaderNotifications />
        <Separator
          className="hidden h-4 data-[orientation=vertical]:self-center sm:block"
          orientation="vertical"
        />
        <NavUser />
      </div>
    </header>
  )
}
