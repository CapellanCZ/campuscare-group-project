"use client"

import { HeaderNotifications } from "@/components/header-notifications"
import { Separator } from "@/components/ui/separator"
import { NavUser } from "@/components/nav-user"
import type { WebRole } from "@/lib/auth/types"

type RoleHeaderProps = {
  role: WebRole
  staffName?: string
  staffEmail?: string
  staffRoleLabel?: string
  profileHref?: string
}

export function RoleHeader(_props: RoleHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-end gap-3 border-b bg-background/95 px-4 backdrop-blur-md md:px-6">
      <div className="flex shrink-0 items-center gap-3">
        <HeaderNotifications />
        <Separator
          orientation="vertical"
          className="hidden h-4 data-[orientation=vertical]:self-center sm:block"
        />
        <NavUser />
      </div>
    </header>
  )
}
