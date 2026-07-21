import { FadeIn } from "@/components/landing/fade-in"
import { SectionHeading } from "@/components/landing/section-heading"

export function AboutSection() {
  return (
    <section id="about" className="landing-band px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="About The HSO"
            title="Health Services Office at National University - Dasmarinas"
            description="The Health Services Office is the university unit responsible for campus health support, including consultation assistance, medical records handling, health documentation, and wellness-related coordination for institutional healthcare programs."
          />
        </FadeIn>
      </div>
    </section>
  )
}
