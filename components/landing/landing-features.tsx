"use client"

import { motion, useReducedMotion } from "motion/react"

import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import { features } from "@/lib/landing/content"

export function LandingFeatures() {
  const reduceMotion = useReducedMotion()

  return (
    <ScrollFadeSection
      id="features"
      className="scroll-mt-20 border-b border-slate-200/80 bg-slate-50/80"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.16em] text-blue-600 uppercase">
              Features
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything your team needs
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-pretty text-slate-600">
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
                    reduceMotion
                      ? undefined
                      : { y: -4, transition: { duration: 0.2 } }
                  }
                  className="h-full min-w-0"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {feature.description}
                    </p>
                  </article>
                </motion.div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </ScrollFadeSection>
  )
}
