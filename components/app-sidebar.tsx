"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavGroup } from "@/components/nav-group"
import {
  getFooterNavLinks,
  getNavGroupsForRole,
} from "@/components/app-shared"
import { useStaffAccess } from "@/components/staff-access-provider"
import { staffBasePath } from "@/lib/auth/home-path"
import { canViewModule } from "@/lib/auth/permissions"
import { IconHeartPlus } from "@tabler/icons-react"

export function AppSidebar() {
  const pathname = usePathname()
  const { primaryRole, designation } = useStaffAccess()
  const role = primaryRole ?? designation
  const base = staffBasePath(role)

  const groups = getNavGroupsForRole(role, pathname)
  const footerNavLinks = getFooterNavLinks(role)
  const showQueueCta = canViewModule(role, "queue_management")

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton render={<Link href={base} />}>
          <img src="/images/Heart.png" alt="" className="h-7" />
          <span className="font-medium">CampusCare</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        {showQueueCta ? (
          <SidebarGroup>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                tooltip="Open live queue"
                render={<Link href={`${base}/queue`} />}
              >
                <IconHeartPlus />
                <span>Manage queue</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroup>
        ) : null}
        {groups.map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="mt-2">
          {footerNavLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                className="text-muted-foreground"
                size="sm"
                render={<Link href={item.path ?? base} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
