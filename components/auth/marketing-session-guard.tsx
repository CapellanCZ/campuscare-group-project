"use client"

import { useEffect } from "react"

import { createClient } from "@/lib/supabase/client"

/**
 * Public marketing pages: if a staff session is present (typed URL, Back,
 * or bfcache restore), bounce into the authenticated continue flow.
 */
export function MarketingSessionGuard() {
  useEffect(() => {
    const supabase = createClient()

    const bounceIfSignedIn = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          window.location.replace("/auth/continue")
        }
      } catch {
        // Ignore transient client failures.
      }
    }

    void bounceIfSignedIn()

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
        return
      }
      void bounceIfSignedIn()
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void bounceIfSignedIn()
      }
    }

    window.addEventListener("pageshow", onPageShow)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.removeEventListener("pageshow", onPageShow)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return null
}
