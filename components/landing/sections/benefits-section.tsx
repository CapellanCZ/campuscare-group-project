import { IconAccessible, IconClockHour4, IconFileCheck, IconLock } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { benefits } from "@/lib/landing/content"
import { FadeIn } from "@/components/landing/fade-in"
import { SectionHeading } from "@/components/landing/section-heading"

const benefitIcons = [IconClockHour4, IconFileCheck, IconAccessible, IconLock]

export function BenefitsSection() {
  return (
    <section className="landing-band-soft px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <FadeIn>
          <SectionHeading
            eyebrow="Benefits"
            title="Better healthcare delivery for every campus stakeholder"
            description="Digitized workflows improve service quality while reducing administrative burden on the Health Services Office."
          />
        </FadeIn>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item, index) => {
            const Icon = benefitIcons[index]
            return (
              <FadeIn key={item.title} delay={index * 0.05}>
                <Card className="landing-card h-full rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-[0_22px_40px_-24px_rgba(37,99,235,0.5)]">
                  <CardContent className="space-y-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-[#2563EB]">
                      <Icon className="size-4.5" aria-hidden />
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm leading-7 text-slate-700">{item.description}</p>
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
