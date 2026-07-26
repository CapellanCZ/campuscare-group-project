"use client"

import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import { Card, CardContent } from "@/components/ui/card"
import { aboutCopy } from "@/lib/landing/content"

export function LandingAbout() {
  return (
    <ScrollFadeSection
      id="about"
      className="scroll-mt-20 border-b border-border/60"
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="min-w-0 space-y-4">
          <Reveal>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              {aboutCopy.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {aboutCopy.title}
            </h2>
          </Reveal>
          <div className="space-y-4">
            {aboutCopy.body.map((paragraph, index) => (
              <Reveal key={paragraph.slice(0, 24)} delay={0.1 + index * 0.06}>
                <p className="text-pretty text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.12} className="min-w-0">
          <Card className="shadow-sm">
            <CardContent className="space-y-4 pt-(--card-spacing)">
              <div className="rounded-2xl bg-primary/5 p-6">
                <p className="text-sm font-semibold text-primary">Mission</p>
                <p className="mt-2 text-base font-medium text-foreground">
                  Accessible campus health care that keeps the Bulldog community
                  ready to learn and serve.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="rounded-xl bg-muted/50 px-4 py-3">
                  Clinical consultations for students, faculty, and staff
                </li>
                <li className="rounded-xl bg-muted/50 px-4 py-3">
                  Preventive services and health coordination
                </li>
                <li className="rounded-xl bg-muted/50 px-4 py-3">
                  Documentation support including medical certificates
                </li>
              </ul>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </ScrollFadeSection>
  )
}
