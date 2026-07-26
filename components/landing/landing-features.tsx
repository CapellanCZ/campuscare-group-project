"use client"

import { motion, useReducedMotion } from "motion/react"

import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { features } from "@/lib/landing/content"

export function LandingFeatures() {
  const reduceMotion = useReducedMotion()

  return (
    <ScrollFadeSection
      id="features"
      className="scroll-mt-20 border-b border-border/60 bg-muted/30"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <Reveal>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              Features
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything the clinic needs in one place
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-pretty text-muted-foreground">
              Practical tools for consultation flow, documentation, and campus
              health communication.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Reveal key={feature.title} delay={0.05 * index}>
                <motion.div
                  whileHover={
                    reduceMotion ? undefined : { y: -6, transition: { duration: 0.2 } }
                  }
                  className="h-full min-w-0"
                >
                  <Card className="h-full shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader>
                      <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <CardTitle className="truncate text-base">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-pretty">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </ScrollFadeSection>
  )
}
