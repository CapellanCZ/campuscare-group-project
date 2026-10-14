"use client"

import { useRef } from "react"
import { motion, useInView } from "motion/react"

import { LandingLogo } from "@/components/landing/landing-logo"
import { useMotionReady } from "@/components/landing/use-motion-ready"
import { whyUsPoints } from "@/lib/landing/content"

const ease = [0.22, 1, 0.36, 1] as const

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.12 },
  },
}

const rowVariants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease },
  },
}

/**
 * Why Us — blue panel + icon rows.
 * Content stays visible unless we’re actively playing an enter animation
 * (avoids the empty white shell when motion-ready remounts mid-scroll).
 */
export function WhyPoints() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(rootRef, { once: true, amount: 0.2 })
  const { allowMotion, ready } = useMotionReady()

  const canAnimate = ready && allowMotion
  // Visible by default; only hide briefly when animating in from off-screen.
  const play = !canAnimate || inView

  return (
    <div
      ref={rootRef}
      className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8"
    >
      <motion.div
        className="flex flex-col justify-between rounded-[1.75rem] bg-blue-600 px-7 py-8 text-white sm:rounded-[2rem] sm:px-9 sm:py-10"
        initial={false}
        animate={
          canAnimate
            ? play
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 24, scale: 0.98 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{ duration: 0.55, ease }}
      >
        <div>
          <LandingLogo
            tone="white"
            className="h-9 w-auto sm:h-10 lg:h-11"
            alt="CampusCare"
          />
          <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Why CampusCare?
          </h2>
          <p className="mt-4 max-w-sm text-pretty text-base leading-relaxed text-blue-100 sm:text-lg">
            Built for how the Health Services Office already works — records,
            queues, and clinic devices in one place.
          </p>
        </div>
        <p className="mt-10 text-sm font-medium text-blue-200">
          NU Dasmariñas · Health Services Office
        </p>
      </motion.div>

      <motion.ul
        className="flex min-w-0 flex-col justify-center rounded-[1.75rem] border border-slate-200/90 bg-white px-5 py-2 sm:rounded-[2rem] sm:px-7 sm:py-3"
        variants={listVariants}
        initial={false}
        animate={canAnimate ? (play ? "show" : "hidden") : "show"}
      >
        {whyUsPoints.map((point) => {
          const Icon = point.icon
          return (
            <motion.li
              key={point.title}
              variants={rowVariants}
              className="flex gap-3.5 border-b border-slate-100 py-5 last:border-b-0 sm:gap-4 sm:py-6"
            >
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:size-11">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight text-slate-900">
                  {point.title}
                </h3>
                <p className="mt-1 text-pretty text-sm leading-relaxed text-slate-500">
                  {point.description}
                </p>
              </div>
            </motion.li>
          )
        })}
      </motion.ul>
    </div>
  )
}
