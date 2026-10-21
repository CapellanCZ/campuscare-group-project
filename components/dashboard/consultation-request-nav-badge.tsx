"use client"

import { usePathname } from "next/navigation"

import { SidebarMenuBadge } from "@/components/ui/sidebar"
import { usePendingRequestNavCount } from "@/hooks/use-pending-request-nav-count"
import { cn } from "@/lib/utils"

export function isConsultationRequestsNavHref(href: string): boolean {
  return (
    href.includes("/consultation-requests") || href.includes("/requests")
  )
}

/** Soft live counter for pending consultation requests in the role sidebar. */
export function ConsultationRequestNavBadge() {
  const pathname = usePathname()
  const onRequestsPage = isConsultationRequestsNavHref(pathname)
  const { count, bumped } = usePendingRequestNavCount(true)

  // Hide while the inbox is open — you're already looking at the work.
  if (onRequestsPage || count <= 0) return null

  return (
    <SidebarMenuBadge
      className={cn(
        "bg-primary/15 text-primary ring-1 ring-primary/25 transition-transform duration-300",
        bumped && "scale-110 bg-primary text-primary-foreground ring-primary/40"
      )}
      aria-label={`${count} pending consultation requests`}
    >
      {count > 99 ? "99+" : count}
    </SidebarMenuBadge>
  )
}
