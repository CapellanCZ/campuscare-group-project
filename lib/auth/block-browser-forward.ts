/**
 * After the user presses Back, clear the Forward stack so they cannot
 * return to the page they left. Safe to call on popstate or on mount.
 */
export function clearBrowserForwardStack() {
  if (typeof window === "undefined") return
  window.history.pushState(
    window.history.state ?? { campuscare: "forward-block" },
    "",
    window.location.href
  )
}
