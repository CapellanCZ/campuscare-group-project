"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { IconChevronRight, IconPlus } from "@tabler/icons-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  getRoleNavConfig,
  type RoleNavItem,
} from "@/lib/navigation/role-nav"
import type { WebRole } from "@/lib/auth/types"

type RoleSidebarProps = {
  role: WebRole
}

function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href.includes("?")) return pathname === href.split("?")[0]
  return pathname.startsWith(`${href}/`)
}

function itemOrChildActive(pathname: string, item: RoleNavItem): boolean {
  if (isNavActive(pathname, item.href)) return true
  return Boolean(item.children?.some((child) => isNavActive(pathname, child.href)))
}

function NavLeaf({ item, pathname }: { item: RoleNavItem; pathname: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isNavActive(pathname, item.href)}
        render={<Link href={item.href} />}
      >
        {item.icon ? <item.icon /> : null}
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavBranch({ item, pathname }: { item: RoleNavItem; pathname: string }) {
  const open = itemOrChildActive(pathname, item)

  return (
    <Collapsible
      className="group/collapsible"
      defaultOpen={open}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton isActive={itemOrChildActive(pathname, item)} />
        }
      >
        {item.icon ? <item.icon /> : null}
        <span>{item.title}</span>
        <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-90 group-data-[open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                isActive={isNavActive(pathname, child.href)}
                render={<Link href={child.href} />}
              >
                {child.icon ? <child.icon /> : null}
                <span>{child.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
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
              href={nav.groups[0]?.items[0]?.href ?? `/${role}/dashboard`}
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
              className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
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
              {group.items.map((item) =>
                item.children?.length ? (
                  <NavBranch key={item.title} item={item} pathname={pathname} />
                ) : (
                  <NavLeaf key={item.title} item={item} pathname={pathname} />
                )
              )}
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
