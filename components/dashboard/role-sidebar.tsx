"use client"

import Link from "next/link"
import { IconChevronRight, IconPlus } from "@tabler/icons-react"

import { CampusCareLogo } from "@/components/campuscare-logo"
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
import { SidebarUtilityFooter } from "@/components/dashboard/sidebar-utility-footer"
import { useNavPending } from "@/components/dashboard/nav-pending"
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

function NavLeaf({
  item,
  activePath,
  onNavigate,
  onPrefetch,
}: {
  item: RoleNavItem
  activePath: string
  onNavigate: (href: string) => void
  onPrefetch: (href: string) => void
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isNavActive(activePath, item.href)}
        render={
          <Link
            href={item.href}
            prefetch
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return
              }
              event.preventDefault()
              onNavigate(item.href)
            }}
            onMouseEnter={() => onPrefetch(item.href)}
            onFocus={() => onPrefetch(item.href)}
          />
        }
      >
        {item.icon ? <item.icon aria-hidden /> : null}
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavBranch({
  item,
  activePath,
  onNavigate,
  onPrefetch,
}: {
  item: RoleNavItem
  activePath: string
  onNavigate: (href: string) => void
  onPrefetch: (href: string) => void
}) {
  const open = itemOrChildActive(activePath, item)

  return (
    <Collapsible
      className="group/collapsible"
      defaultOpen={open}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton isActive={itemOrChildActive(activePath, item)} />
        }
      >
        {item.icon ? <item.icon aria-hidden /> : null}
        <span>{item.title}</span>
        <IconChevronRight
          aria-hidden
          className="ml-auto transition-transform duration-150 group-data-[panel-open]/collapsible:rotate-90 group-data-[open]/collapsible:rotate-90"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                isActive={isNavActive(activePath, child.href)}
                render={
                  <Link
                    href={child.href}
                    prefetch
                    onClick={(event) => {
                      if (
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey ||
                        event.button !== 0
                      ) {
                        return
                      }
                      event.preventDefault()
                      onNavigate(child.href)
                    }}
                    onMouseEnter={() => onPrefetch(child.href)}
                    onFocus={() => onPrefetch(child.href)}
                  />
                }
              >
                {child.icon ? <child.icon aria-hidden /> : null}
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
  const { activePath, navigate, prefetch } = useNavPending()
  const nav = getRoleNavConfig(role)
  const homeHref = nav.groups[0]?.items[0]?.href ?? `/${role}/dashboard`

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center">
        <SidebarMenuButton
          render={
            <Link
              href={homeHref}
              prefetch
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return
                }
                event.preventDefault()
                navigate(homeHref)
              }}
            />
          }
        >
          <CampusCareLogo alt="CampusCare" width={28} height={28} className="size-7" />
          <span className="font-medium">CampusCare</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-2">
          <SidebarMenuItem className="w-full">
            <Button
              className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
              render={
                <Link
                  href={nav.quickActionHref ?? "#"}
                  prefetch={Boolean(nav.quickActionHref)}
                  onClick={(event) => {
                    if (!nav.quickActionHref) return
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey ||
                      event.button !== 0
                    ) {
                      return
                    }
                    event.preventDefault()
                    navigate(nav.quickActionHref)
                  }}
                />
              }
              nativeButton={false}
            >
              <IconPlus data-icon="inline-start" aria-hidden />
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
                  <NavBranch
                    key={item.title}
                    item={item}
                    activePath={activePath}
                    onNavigate={navigate}
                    onPrefetch={prefetch}
                  />
                ) : (
                  <NavLeaf
                    key={item.title}
                    item={item}
                    activePath={activePath}
                    onNavigate={navigate}
                    onPrefetch={prefetch}
                  />
                )
              )}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarUtilityFooter />
      </SidebarFooter>
    </Sidebar>
  )
}
