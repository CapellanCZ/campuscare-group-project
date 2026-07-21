import {
  IconChartHistogram,
  IconClipboardList,
  IconFileDescription,
  IconQueuePopIn,
  IconSpeakerphone,
} from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { FadeIn } from "@/components/landing/fade-in"
import { SectionHeading } from "@/components/landing/section-heading"
import { features } from "@/lib/landing/content"

const featureIcons = [
  IconClipboardList,
  IconQueuePopIn,
  IconFileDescription,
  IconFileDescription,
  IconChartHistogram,
  IconSpeakerphone,
]

export function FeaturesSection() {
  return (
    <section id="features" className="landing-band-soft px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="Features"
            title="Everything HSO needs in one connected platform"
            description="CampusCare unifies core healthcare operations so requests, consultations, records, and communication move through one streamlined workflow."
          />
        </FadeIn>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = featureIcons[index]
            return (
              <FadeIn key={feature.title} delay={index * 0.05}>
                <Card className="landing-card h-full rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-[0_22px_40px_-24px_rgba(37,99,235,0.5)]">
                  <CardContent className="space-y-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-[#2563EB]">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-7 text-slate-700">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
