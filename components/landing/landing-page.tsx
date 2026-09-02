"use client"

import { LandingAbout } from "@/components/landing/landing-about"
import { LandingFaq } from "@/components/landing/landing-faq"
import { LandingFeatures } from "@/components/landing/landing-features"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works"
import { LandingNav } from "@/components/landing/landing-nav"

export function LandingPage() {
  return (
    <div className="landing-theme min-h-screen">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingAbout />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  )
}
