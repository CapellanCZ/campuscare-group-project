"use client"

import { useEffect, useState, type MouseEvent } from "react"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { SidebarNavGroup, SidebarNavItem } from "@/components/app-shared"
import { useOptionalNavPending } from "@/components/dashboard/nav-pending"
import { warmStaffRouteData } from "@/components/nav-warm"
import { useStaffAccess } from "@/components/staff-access-provider"
import { IconChevronRight } from "@tabler/icons-react"

type ClinicRole = "nurse" | "physician" | "dentist" | "admin"

function useNavLinkHandlers() {
  const { isMobile, setOpenMobile } = useSidebar()
  const navPending = useOptionalNavPending()
  const { primaryRole, designation } = useStaffAccess()
  const role = (primaryRole ?? designation) as ClinicRole | null

  return (href: string) => ({
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return
      }
      if (
        navPending?.isPending &&
        navPending.activePath === href.split("?")[0]
      ) {
        event.preventDefault()
        return
      }
      navPending?.markPending(href)
      if (role) void warmStaffRouteData(href, role)
      if (isMobile) setOpenMobile(false)
    },
    onMouseEnter: () => {
      navPending?.prefetch(href)
      if (role) void warmStaffRouteData(href, role)
    },
    onFocus: () => {
      navPending?.prefetch(href)
      if (role) void warmStaffRouteData(href, role)
    },
  })
}

export function NavGroup({ label, items }: SidebarNavGroup) {
  const linkHandlers = useNavLinkHandlers()

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) =>
          item.subItems?.length ? (
            <CollapsibleNavItem key={item.title} item={item} />
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={item.isActive}
                render={
                  <Link
                    href={item.path ?? "#"}
                    {...(item.path ? linkHandlers(item.path) : {})}
                  />
                }
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function CollapsibleNavItem({ item }: { item: SidebarNavItem }) {
  const linkHandlers = useNavLinkHandlers()
  const shouldOpen =
    !!item.isActive || !!item.subItems?.some((sub) => !!sub.isActive)
  const [open, setOpen] = useState(shouldOpen)

  useEffect(() => {
    if (shouldOpen) setOpen(true)
  }, [shouldOpen])

  return (
    <Collapsible
      className="group/collapsible"
      open={open}
      onOpenChange={setOpen}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={<SidebarMenuButton isActive={item.isActive} />}
      >
        {item.icon}
        <span>{item.title}</span>
        <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.subItems?.map((subItem) => (
            <SidebarMenuSubItem key={subItem.title}>
              <SidebarMenuSubButton
                isActive={subItem.isActive}
                render={
                  <Link
                    href={subItem.path ?? "#"}
                    {...(subItem.path ? linkHandlers(subItem.path) : {})}
                  />
                }
              >
                {subItem.icon}
                <span>{subItem.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}
