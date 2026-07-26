"use client"

import { HeaderNotifications } from "@/components/header-notifications"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { NavUser } from "@/components/nav-user"
import { useNavPending } from "@/components/dashboard/nav-pending"
import { resolveRoleNavItem } from "@/lib/navigation/role-nav"
import type { WebRole } from "@/lib/auth/types"

type RoleHeaderProps = {
  role: WebRole
  staffName?: string
  staffEmail?: string
  staffRoleLabel?: string
  profileHref?: string
}

export function RoleHeader({ role }: RoleHeaderProps) {
  const { activePath } = useNavPending()
  const currentPage = resolveRoleNavItem(role, activePath)
  const PageIcon = currentPage.icon

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur-md md:px-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="gap-2">
            {PageIcon ? (
              <PageIcon className="size-4 text-foreground/70" aria-hidden />
            ) : null}
            <BreadcrumbPage className="text-sm font-medium">
              {currentPage.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <HeaderNotifications />
        <Separator
          orientation="vertical"
          className="h-4 data-[orientation=vertical]:self-center"
        />
        <NavUser />
      </div>
    </header>
  )
}
