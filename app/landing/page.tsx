import { MarketingSessionGuard } from "@/components/auth/marketing-session-guard"
import { LandingPage } from "@/components/landing/landing-page"
import { redirectAuthenticatedFromMarketing } from "@/lib/auth/redirect-authenticated-from-marketing"
import {
  buildLandingJsonLd,
  buildLandingMetadata,
} from "@/lib/landing/seo"

export const metadata = buildLandingMetadata()
export const dynamic = "force-dynamic"

export default async function LandingRoutePage() {
  await redirectAuthenticatedFromMarketing()

  const jsonLd = buildLandingJsonLd()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingSessionGuard />
      <LandingPage />
    </>
  )
}
