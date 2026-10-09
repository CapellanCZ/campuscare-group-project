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
import { useStaffAccess } from "@/components/staff-access-provider"
import { prefetchConsultationsPage } from "@/features/consultations/lib/prefetch-consultations"
import { prefetchDashboardPage } from "@/features/dashboard/lib/prefetch-dashboard"
import { IconChevronRight } from "@tabler/icons-react"

function warmRouteData(href: string, role: string | null | undefined) {
  if (!role) return
  const clinicRole = role as "nurse" | "physician" | "dentist" | "admin"
  if (href.includes("/consultations")) {
    prefetchConsultationsPage(clinicRole)
  }
  if (
    href.endsWith("/dashboard") ||
    href === `/${role}` ||
    href === `/${role}/`
  ) {
    prefetchDashboardPage(clinicRole)
  }
}

function useNavLinkHandlers() {
  const { isMobile, setOpenMobile } = useSidebar()
  const navPending = useOptionalNavPending()
  const { primaryRole, designation } = useStaffAccess()
  const role = primaryRole ?? designation

  return (href: string) => ({
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      // Let modified clicks (new tab) use the native link.
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
      if (navPending?.isPending) return
      warmRouteData(href, role)
      if (isMobile) setOpenMobile(false)
      if (navPending) {
        navPending.navigate(href)
        return
      }
      window.location.assign(href)
    },
    onMouseEnter: () => {
      navPending?.prefetch(href)
      warmRouteData(href, role)
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
