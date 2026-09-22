import { LandingPage } from "@/components/landing/landing-page"
import { buildLandingMetadata } from "@/lib/landing/seo"

export const metadata = buildLandingMetadata()

export default function LandingRoutePage() {
  return <LandingPage />
}
