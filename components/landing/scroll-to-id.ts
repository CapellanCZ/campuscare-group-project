import { smoothScrollToElement } from "@/lib/scroll/lenis-store"

/** Sticky landing nav height compensation (h-14 / sm:h-16 + a little air). */
const LANDING_NAV_OFFSET = 88

/** Smooth-scroll to an in-page section without changing the URL (no hash). */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return

  smoothScrollToElement(el, LANDING_NAV_OFFSET)

  if (typeof window !== "undefined" && window.location.hash) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`
    )
  }
}
