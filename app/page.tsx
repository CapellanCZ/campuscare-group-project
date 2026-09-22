import { permanentRedirect } from "next/navigation"

import { siteRoutes } from "@/lib/site/routes"

/**
 * Canonical public site lives at `/landing`.
 * Single permanent redirect — no chains — so crawlers index `/landing`.
 */
export default function RootPage() {
  permanentRedirect(siteRoutes.home)
}
