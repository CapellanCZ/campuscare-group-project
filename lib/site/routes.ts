/** Canonical public routes — use these instead of hardcoding paths. */
export const siteRoutes = {
  home: "/landing",
  login: "/login",
  privacy: "/privacy",
  terms: "/terms",
  dataPrivacy: "/data-privacy",
} as const

export type SiteRoute = (typeof siteRoutes)[keyof typeof siteRoutes]
