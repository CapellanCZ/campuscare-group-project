"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { LatestChange } from "@/components/latest-change"
import { useStaffAccess } from "@/components/staff-access-provider"
import { staffBasePath } from "@/lib/auth/home-path"

export function AppSidebar() {
  const pathname = usePathname()
  const { primaryRole, designation } = useStaffAccess()
  const role = primaryRole ?? designation
  const base = staffBasePath(role)

  const groups = getNavGroupsForRole(role, pathname)
  const footerNavLinks = getFooterNavLinks(role)

  return (
    <Sidebar
      className={cn(
        "*:data-[slot=sidebar-inner]:bg-background",
        "*:data-[slot=sidebar-inner]:dark:bg-[radial-gradient(60%_18%_at_10%_0%,--theme(--color-foreground/.08),transparent)]",
        "**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75"
      )}
      collapsible="icon"
      variant="sidebar"
    >
      <SidebarHeader className="h-14 justify-center border-b px-2">
        <SidebarMenuButton render={<Link href={base} />}>
          <img src="/images/Heart.png" alt="" className="size-5" />
          <span className="font-medium text-foreground!">CampusCare</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-0 p-0">
        <LatestChange />
        <SidebarMenu className="border-t p-2">
          {footerNavLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                className="text-muted-foreground"
                size="sm"
                render={<Link href={item.path ?? base} />}
              >
                {item.icon}
                <span className="font-medium">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="px-4 pt-4 pb-2 transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0">
          <p className="text-nowrap text-[9px] text-muted-foreground">
            © {new Date().getFullYear()} CampusCare · NU Dasmariñas
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
