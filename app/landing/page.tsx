import { LandingPage } from "@/components/landing/landing-page"
import {
  buildLandingJsonLd,
  buildLandingMetadata,
} from "@/lib/landing/seo"

export const metadata = buildLandingMetadata()

export default function LandingRoutePage() {
  const jsonLd = buildLandingJsonLd()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
