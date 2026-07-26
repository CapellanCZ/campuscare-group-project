"use client"

import { usePathname } from "next/navigation"
import { IconBell } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AppBreadcrumbs } from "@/components/app-breadcrumbs"
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger"
import { resolveActiveNav } from "@/components/app-shared"
import { HeaderSearch } from "@/components/header-search"
import { NavUser } from "@/components/nav-user"
import { useOptionalStaffAccess } from "@/components/staff-access-provider"

export function AppHeader() {
  const pathname = usePathname()
  const access = useOptionalStaffAccess()
  const activeItem = resolveActiveNav(pathname, access?.primaryRole)

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-5 backdrop-blur md:gap-4 md:px-8"
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
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <HeaderSearch />
        <Button
          type="button"
          aria-label="Notifications"
          size="icon-sm"
          variant="outline"
          className="relative shrink-0 rounded-full"
        >
          <IconBell aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-foreground"
          />
        </Button>
        <Separator
          className="hidden h-4 shrink-0 data-[orientation=vertical]:self-center sm:block"
          orientation="vertical"
        />
        <div className="shrink-0 pl-0.5">
          <NavUser />
        </div>
      </div>
    </header>
  )
}
