/** Smooth-scroll to an in-page section without changing the URL (no hash). */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: "smooth", block: "start" })
  if (typeof window !== "undefined" && window.location.hash) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`
    )
  }
}
