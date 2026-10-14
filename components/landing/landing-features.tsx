"use client"

import { motion } from "motion/react"

import { Reveal } from "@/components/landing/motion"
import { useMotionReady } from "@/components/landing/use-motion-ready"
import { landingSectionInner } from "@/components/landing/section-shell"
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
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: easeOut },
  },
}

const iconVariants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: easeOut, delay: 0.05 },
  },
}

export function LandingFeatures() {
  const { allowMotion, ready } = useMotionReady()
  const canAnimate = ready && allowMotion

  return (
    <section
      id="features"
      className={cn(
        "scroll-mt-20 overflow-x-clip border-b border-slate-200/80 bg-slate-50/80 py-10 sm:py-12 lg:py-16",
        "lg:flex lg:min-h-[calc(100dvh-4rem)] lg:items-center lg:py-0"
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

        <motion.div
          className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
          variants={gridVariants}
          initial={canAnimate ? "hidden" : "show"}
          whileInView="show"
          viewport={{ once: true, amount: 0.12, margin: "0px 0px -6% 0px" }}
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={
                  canAnimate
                    ? { y: -5, transition: { duration: 0.2 } }
                    : undefined
                }
                className="h-full min-w-0"
              >
                <FeatureCard
                  title={feature.title}
                  description={feature.description}
                  Icon={Icon}
                  animated={canAnimate}
                />
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureCard({
  title,
  description,
  Icon,
  animated = false,
}: {
  title: string
  description: string
  Icon: (typeof features)[number]["icon"]
  animated?: boolean
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7">
      {animated ? (
        <motion.div
          variants={iconVariants}
          className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
        >
          <Icon className="size-5" aria-hidden />
        </motion.div>
      ) : (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
        {description}
      </p>
    </article>
  )
}
