import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthPage } from "@/components/auth/auth-page"
import { getSiteUrl } from "@/lib/landing/seo"
import { siteRoutes } from "@/lib/site/routes"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to CampusCare with your campus email to access NU Dasmariñas Health Services tools.",
  alternates: {
    canonical: `${siteUrl}${siteRoutes.login}`,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Sign in · CampusCare",
    description:
      "Sign in to CampusCare with your campus email to access NU Dasmariñas Health Services tools.",
    url: `${siteUrl}${siteRoutes.login}`,
  },
}

function LoginFallback() {
  return (
    <div
      className="flex min-h-svh items-center justify-center bg-background px-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">Loading sign-in…</p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AuthPage />
    </Suspense>
  )
}
