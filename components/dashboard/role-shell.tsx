"use client"

import { useMemo } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { RoleSidebar } from "@/components/dashboard/role-sidebar"
import { RoleHeader } from "@/components/dashboard/role-header"
import { NavPendingProvider, useNavPending } from "@/components/dashboard/nav-pending"
import { collectRoleNavHrefs } from "@/lib/navigation/role-nav"
import type { WebRole } from "@/lib/auth/types"

type RoleShellProps = {
  role: WebRole
  staffName?: string
  staffEmail?: string
  children: React.ReactNode
}

const ROLE_LABEL: Record<WebRole, string> = {
  admin: "Administrator",
  nurse: "Nurse",
  physician: "Physician",
  dentist: "Dentist",
  queue_display: "Queue Display",
}

const PROFILE_HREF: Record<WebRole, string> = {
  admin: "/admin/settings",
  nurse: "/nurse/profile",
  physician: "/physician/profile",
  dentist: "/dentist/dashboard?module=profile",
  queue_display: "/queue-management/display",
}

function ShellContent({
  role,
  staffName,
  staffEmail,
  children,
}: RoleShellProps) {
  const { isPending } = useNavPending()

  return (
    <SidebarProvider className="relative h-svh">
      <RoleSidebar role={role} />
      <SidebarInset className="min-h-0 md:peer-data-[variant=inset]:ml-0">
        <RoleHeader
          role={role}
          staffName={staffName}
          staffEmail={staffEmail}
          staffRoleLabel={ROLE_LABEL[role]}
          profileHref={PROFILE_HREF[role]}
        />
        <div
          className={
            isPending
              ? "flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4 opacity-70 transition-opacity duration-150 md:p-6"
              : "flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4 opacity-100 transition-opacity duration-150 md:p-6"
          }
          aria-busy={isPending || undefined}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function RoleShell({
  role,
  staffName,
  staffEmail,
  children,
}: RoleShellProps) {
  const prefetchHrefs = useMemo(() => collectRoleNavHrefs(role), [role])

  return (
    <NavPendingProvider prefetchHrefs={prefetchHrefs}>
      <ShellContent role={role} staffName={staffName} staffEmail={staffEmail}>
        {children}
      </ShellContent>
    </NavPendingProvider>
  )
}
