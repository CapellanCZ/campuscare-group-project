"use client"

import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AppBreadcrumbs } from "@/components/app-breadcrumbs"
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger"
import { resolveActiveNav } from "@/components/app-shared"
import { NavUser } from "@/components/nav-user"
import { useOptionalStaffAccess } from "@/components/staff-access-provider"
import { designationLabel } from "@/lib/health/roles"
import { formatLongDate } from "@/lib/health/time"
import { Badge } from "@/components/ui/badge"
import { IconBell } from "@tabler/icons-react"

export function AppHeader() {
  const pathname = usePathname()
  const access = useOptionalStaffAccess()
  const activeItem = resolveActiveNav(pathname, access?.primaryRole)

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur md:px-6"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs page={activeItem} />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden min-w-0 text-right md:block">
          <p className="truncate text-sm font-medium">
            {access ? `Hi, ${access.fullName.split(" ")[0]}` : "Staff"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatLongDate()}
          </p>
        </div>
        {access ? (
          <Badge variant="outline" className="hidden sm:inline-flex">
            {designationLabel(access.primaryRole)}
          </Badge>
        ) : null}
        <Button aria-label="Notifications" size="icon-sm" variant="outline">
          <IconBell />
        </Button>
        <Separator
          className="hidden h-4 data-[orientation=vertical]:self-center sm:block"
          orientation="vertical"
        />
        <NavUser />
      </div>
    </header>
  )
}
