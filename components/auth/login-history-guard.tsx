"use client"

import { useEffect } from "react"

import { clearBrowserForwardStack } from "@/lib/auth/block-browser-forward"

/**
 * Login surface:
 * - Clean logout query markers (replaceState).
 * - After Back onto login (or on mount), clear Forward so staff pages
 *   cannot be restored with the browser Forward button.
 * - Reload bfcache restores.
 */
export function LoginHistoryGuard() {
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has("from") || url.searchParams.has("reason")) {
      url.searchParams.delete("from")
      url.searchParams.delete("reason")
      const clean = `${url.pathname}${url.search}${url.hash}`
      window.history.replaceState(window.history.state, "", clean)
    }

    // Drop any Forward entry that still points at a staff page.
    clearBrowserForwardStack()

    const onPopState = () => {
      clearBrowserForwardStack()
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
      }
    }

    window.addEventListener("popstate", onPopState)
    window.addEventListener("pageshow", onPageShow)

    return () => {
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [])

  return null
}
