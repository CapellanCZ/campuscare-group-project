/**
 * App Router `loading.tsx` fallback.
 * Intentionally empty — previous page stays visible until the RSC resolves,
 * so first visits with little data do not flash skeleton chrome.
 */
export function StaffRouteLoading() {
  return null
}
