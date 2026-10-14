import { LandingAbout } from "@/components/landing/landing-about"
import { LandingCta } from "@/components/landing/landing-cta"
import { LandingFaq } from "@/components/landing/landing-faq"
import { LandingFeatures } from "@/components/landing/landing-features"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works"
import { LandingLenis } from "@/components/landing/landing-lenis"
import { LandingMobileApp } from "@/components/landing/landing-mobile-app"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingWhy } from "@/components/landing/landing-why"

/**
 * Static imports keep FAQ accordion `useId` slots stable across SSR/hydration.
 * (next/dynamic LoadableComponent wrappers were shifting Base UI ids.)
 */
export function LandingPage() {
  return (
    <LandingLenis>
      <div className="landing-theme w-full min-h-screen overflow-x-clip bg-white text-slate-900">
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
          <LandingMobileApp />
          <LandingCta />
        </main>
        <LandingFooter />
      </div>
    </LandingLenis>
  )
}
