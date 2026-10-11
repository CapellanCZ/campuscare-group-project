import type { Metadata } from "next"

import { DisplayLoginPage } from "@/components/auth/display-login-page"
import { privateSurfaceMetadata } from "@/lib/landing/seo"

export const metadata: Metadata = {
  ...privateSurfaceMetadata,
  title: "Display sign-in",
  robots: { index: false, follow: false },
}

export default function DisplayLoginRoutePage() {
  return <DisplayLoginPage />
}
