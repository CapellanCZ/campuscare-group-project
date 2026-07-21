"use client"

import { usePathname } from "next/navigation"
import { IconBell, IconMoon, IconSun } from "@tabler/icons-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { NavUser } from "@/components/nav-user"
import { useTheme } from "@/components/theme-provider"
import { resolveRoleNavItem } from "@/lib/navigation/role-nav"
import type { WebRole } from "@/lib/auth/types"

type RoleHeaderProps = {
  role: WebRole
  staffName?: string
  staffEmail?: string
  staffRoleLabel?: string
  profileHref?: string
}

export function RoleHeader({
  role,
  staffName = "Clinic Staff",
  staffEmail = "staff@clinic.edu",
  staffRoleLabel = "Staff",
  profileHref = "/physician/profile",
}: RoleHeaderProps) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const currentPage = resolveRoleNavItem(role, pathname)
  const PageIcon = currentPage.icon

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur-md md:px-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="gap-2">
          {PageIcon ? (
              <PageIcon className="size-4 text-black/70" aria-hidden="true" />
            ) : null}
            <BreadcrumbPage className="text-sm font-medium">
              {currentPage.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <IconSun /> : <IconMoon />}
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Notifications">
          <IconBell />
        </Button>
        <Separator
          orientation="vertical"
          className="h-4 data-[orientation=vertical]:self-center"
        />
        <NavUser
          name={staffName}
          email={staffEmail}
          roleLabel={staffRoleLabel}
          profileHref={profileHref}
        />
      </div>
    </header>
  )
}
