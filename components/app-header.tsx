"use client"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger"
import { DecorIcon } from "@/components/decor-icon"
import { HeaderNotifications } from "@/components/header-notifications"
import { NavUser } from "@/components/nav-user"
import { OnBreakControl } from "@/components/availability/on-break-control"
import { DutyStatusControl } from "@/components/availability/duty-status-control"
import { useOptionalStaffAccess } from "@/components/staff-access-provider"

export function AppHeader() {
  const access = useOptionalStaffAccess()
  const role = access?.primaryRole

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex min-h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:px-4 md:px-6",
        "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50"
      )}
    >
      <DecorIcon className="hidden md:block" position="bottom-left" />
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <CustomSidebarTrigger />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
        {role ? (
          <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
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
