"use client"

import { usePathname } from "next/navigation"

import { Toaster } from "@/components/ui/sonner"
import { APP_TOASTER_IDS } from "@/lib/feedback/app-toast"

function isPublicMarketingPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/landing" ||
    pathname.startsWith("/landing/") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/data-privacy" ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
    pathname === "/display" ||
    pathname.startsWith("/display/") ||
    pathname === "/queue-management/display" ||
    pathname.startsWith("/queue-management/display/")
  )
}

/** Skip Sonner on public marketing/display routes to cut unused client JS. */
export function AppToaster() {
  const pathname = usePathname()
  if (isPublicMarketingPath(pathname)) return null

  return (
    <>
      {/* Queue / form action feedback */}
      <Toaster id={APP_TOASTER_IDS.action} position="top-right" />
      {/* Inbox-style notification alerts */}
      <Toaster id={APP_TOASTER_IDS.notification} position="top-right" />
    </>
  )
}
