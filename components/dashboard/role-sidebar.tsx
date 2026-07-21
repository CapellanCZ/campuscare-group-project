"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { IconPlus } from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { getRoleNavConfig } from "@/lib/navigation/role-nav"
import type { WebRole } from "@/lib/auth/types"

type RoleSidebarProps = {
  role: WebRole
}

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href.includes("?")) return pathname === href.split("?")[0]
  return pathname.startsWith(`${href}/`)
}

export function RoleSidebar({ role }: RoleSidebarProps) {
  const pathname = usePathname()
  const nav = getRoleNavConfig(role)

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton
          render={
            <Link
              href={
                nav.groups[0]?.items[0]?.href ?? `/${role}/dashboard`
              }
            />
          }
        >
          <Image src="/images/Heart.png" alt="CampusCare" width={28} height={28} />
          <span className="font-medium">CampusCare</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-2">
          <SidebarMenuItem className="w-full">
            <Button
              className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90"
              render={<Link href={nav.quickActionHref ?? "#"} />}
              nativeButton={false}
            >
              <IconPlus data-icon="inline-start" />
              <span>{nav.quickActionLabel}</span>
            </Button>
          </SidebarMenuItem>
        </SidebarGroup>
        {nav.groups.map((group) => (
          <SidebarGroup key={group.label ?? group.items[0]?.title}>
            {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isNavActive(pathname, item.href)}
                    render={<Link href={item.href} />}
                  >
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {nav.footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={isNavActive(pathname, item.href)}
                render={<Link href={item.href} />}
              >
                {item.icon ? <item.icon /> : null}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
