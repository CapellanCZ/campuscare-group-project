import type { MetadataRoute } from "next"

import { getSiteUrl } from "@/lib/landing/seo"
import { siteRoutes } from "@/lib/site/routes"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        siteRoutes.home,
        siteRoutes.privacy,
        siteRoutes.terms,
        siteRoutes.dataPrivacy,
        siteRoutes.login,
        "/favicon.ico",
        "/favicon-48.png",
        "/icon-192.png",
        "/icon-512.png",
        "/apple-touch-icon.png",
        "/images/",
      ],
      disallow: [
        "/admin",
        "/nurse",
        "/physician",
        "/dentist",
        "/auth",
        "/dashboard",
        "/queue-management",
        "/api",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
