"use client"

import { motion } from "motion/react"

import { Reveal } from "@/components/landing/motion"
import { useMotionReady } from "@/components/landing/use-motion-ready"
import {
  landingSectionInner,
  landingViewportSection,
} from "@/components/landing/section-shell"
import { features } from "@/lib/landing/content"
import { cn } from "@/lib/utils"

const easeOut = [0.22, 1, 0.36, 1] as const

const gridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
}

export function LandingFeatures() {
  const { allowMotion } = useMotionReady()

  return (
    <section
      id="features"
      className={cn(
        landingViewportSection,
        "scroll-mt-20 border-b border-slate-200/80 bg-slate-50/80"
      )}
    >
      <div className={landingSectionInner}>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.16em] text-blue-600 uppercase">
              Features
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Everything your team needs
            </h2>
          </Reveal>
          <Reveal delay={0.09}>
            <p className="text-pretty text-base text-slate-600 sm:text-lg">
              Practical tools for consultation flow, documentation, and campus
              health communication.
            </p>
          </Reveal>
        </div>

        {allowMotion ? (
          <motion.div
            className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15, margin: "0px 0px -6% 0px" }}
          >
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  variants={cardVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="h-full min-w-0"
                >
                  <FeatureCard
                    title={feature.title}
                    description={feature.description}
                    Icon={Icon}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="h-full min-w-0">
                  <FeatureCard
                    title={feature.title}
                    description={feature.description}
                    Icon={Icon}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function FeatureCard({
  title,
  description,
  Icon,
}: {
  title: string
  description: string
  Icon: (typeof features)[number]["icon"]
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
        {description}
      </p>
    </article>
  )
}
