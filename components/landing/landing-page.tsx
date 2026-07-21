import { AmbientMotion } from "@/components/landing/ambient-motion"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingNavbar } from "@/components/landing/landing-navbar"
import { ScrollProgress } from "@/components/landing/scroll-progress"
import { ShootingStars } from "@/components/landing/shooting-stars"
import { AboutSection } from "@/components/landing/sections/about-section"
import { BenefitsSection } from "@/components/landing/sections/benefits-section"
import { FaqSection } from "@/components/landing/sections/faq-section"
import { FeaturesSection } from "@/components/landing/sections/features-section"
import { HeroSection } from "@/components/landing/sections/hero-section"
import { HowItWorksSection } from "@/components/landing/sections/how-it-works-section"

export function LandingPage() {
  return (
    <div className="landing-theme relative scroll-smooth">
      <ScrollProgress />
      <AmbientMotion />
      <ShootingStars />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-slate-900 focus:shadow-md"
      >
        Skip to main content
      </a>
      <LandingNavbar />
      <main id="main-content" className="relative z-10">
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <HowItWorksSection />
        <BenefitsSection />
        <FaqSection />
      </main>
      <div className="relative z-10">
        <LandingFooter />
      </div>
    </div>
  )
}
