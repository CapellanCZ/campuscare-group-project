import dynamic from "next/dynamic"

import { LandingAbout } from "@/components/landing/landing-about"
import { LandingCta } from "@/components/landing/landing-cta"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingWhy } from "@/components/landing/landing-why"

/** Below-fold interactive sections: SSR HTML for SEO, deferred JS for TBT. */
const LandingFeatures = dynamic(
  () =>
    import("@/components/landing/landing-features").then((m) => ({
      default: m.LandingFeatures,
    })),
  { ssr: true }
)
const LandingHowItWorks = dynamic(
  () =>
    import("@/components/landing/landing-how-it-works").then((m) => ({
      default: m.LandingHowItWorks,
    })),
  { ssr: true }
)
const LandingFaq = dynamic(
  () =>
    import("@/components/landing/landing-faq").then((m) => ({
      default: m.LandingFaq,
    })),
  { ssr: true }
)

export function LandingPage() {
  return (
    <div className="landing-theme min-h-screen bg-white text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:h-auto focus:w-auto items-center focus:overflow-visible focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <LandingNav />
      <main id="main-content">
        <LandingHero />
        <LandingAbout />
        <LandingFeatures />
        <LandingWhy />
        <LandingHowItWorks />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
