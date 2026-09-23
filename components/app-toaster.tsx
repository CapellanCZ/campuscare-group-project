"use client"

import { usePathname } from "next/navigation"

import { Toaster } from "@/components/ui/sonner"

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
  return <Toaster />
}
