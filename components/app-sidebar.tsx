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
  useSidebar,
} from "@/components/ui/sidebar"
import { NavGroup } from "@/components/nav-group"
import {
  getFooterNavLinks,
  getNavGroupsForRole,
} from "@/components/app-shared"
import { CampusCareLogo } from "@/components/campuscare-logo"
import { useOptionalNavPending } from "@/components/dashboard/nav-pending"
import { useStaffAccess } from "@/components/staff-access-provider"
import { staffBasePath } from "@/lib/auth/home-path"

export function AppSidebar() {
  const pathname = usePathname()
  const navPending = useOptionalNavPending()
  const activePath = navPending?.activePath ?? pathname
  const { primaryRole, designation } = useStaffAccess()
  const { isMobile, setOpenMobile } = useSidebar()
  const role = primaryRole ?? designation
  const base = staffBasePath(role)
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false)
  }
  const onNavClick = (href: string) => {
    navPending?.markPending(href)
    closeMobile()
  }

  const groups = getNavGroupsForRole(role, activePath)
  const footerNavLinks = getFooterNavLinks(role, activePath)

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
        <SidebarMenuButton
          isActive={activePath === base || activePath === `${base}/`}
          render={
            <Link
              href={base}
              onClick={() => onNavClick(base)}
              onMouseEnter={() => navPending?.prefetch(base)}
            />
          }
        >
          <CampusCareLogo className="size-5" width={20} height={20} alt="" />
          <span className="font-medium text-foreground!">CampusCare</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-0 p-0">
        {footerNavLinks.length > 0 ? (
          <SidebarMenu className="border-t p-2">
            {footerNavLinks.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  className="text-muted-foreground"
                  size="sm"
                  isActive={item.isActive}
                  render={
                    <Link
                      href={item.path ?? base}
                      onClick={() => onNavClick(item.path ?? base)}
                      onMouseEnter={() =>
                        navPending?.prefetch(item.path ?? base)
                      }
                    />
                  }
                >
                  {item.icon}
                  <span className="font-medium">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        ) : null}
        <div className="border-t px-4 pt-4 pb-2 transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0">
          <p className="text-wrap break-words text-[9px] text-muted-foreground">
            © {new Date().getFullYear()} CampusCare · NU Dasmariñas
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
