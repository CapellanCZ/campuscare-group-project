"use client"

import { useEffect } from "react"

import { clearBrowserForwardStack } from "@/lib/auth/block-browser-forward"
import { allowNextUnload, isUnloadAllowed } from "@/lib/auth/session-unload"
import { createClient } from "@/lib/supabase/client"

/**
 * Staff-shell session safeguards:
 * - Confirm before closing the tab/window.
 * - After Back, clear Forward so the left page cannot be restored.
 * - Reload bfcache restores; bounce to login if session is gone.
 * - Re-check session when the tab becomes visible again.
 */
export function StaffSessionGuard() {
  useEffect(() => {
    const supabase = createClient()

    const ensureSession = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()
        if (!error && !user) {
          allowNextUnload()
          window.location.replace("/login?from=logout&reason=history")
        }
      } catch {
        // Ignore transient auth client failures; proxy still enforces access.
      }
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isUnloadAllowed()) return
      event.preventDefault()
      event.returnValue = ""
    }

    const onPopState = () => {
      clearBrowserForwardStack()
      void ensureSession()
    }

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
        return
      }
      void ensureSession()
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void ensureSession()
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    window.addEventListener("popstate", onPopState)
    window.addEventListener("pageshow", onPageShow)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      window.removeEventListener("popstate", onPopState)
      window.removeEventListener("pageshow", onPageShow)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return null
}
