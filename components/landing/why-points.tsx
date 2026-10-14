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
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease },
  },
}

/**
 * Why Us — blue panel + icon rows.
 * Stacks on mobile; two columns from `lg`.
 */
export function WhyPoints() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(rootRef, { once: true, amount: 0.15 })
  const { allowMotion, ready } = useMotionReady()

  const canAnimate = ready && allowMotion
  const play = !canAnimate || inView

  return (
    <div
      ref={rootRef}
      className="grid w-full min-w-0 items-stretch gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-8"
    >
      <motion.div
        className="flex min-w-0 flex-col justify-between rounded-2xl bg-blue-600 px-5 py-6 text-white sm:rounded-[1.75rem] sm:px-7 sm:py-8 lg:rounded-[2rem] lg:px-9 lg:py-10"
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
        <div className="min-w-0">
          <LandingLogo
            tone="white"
            className="h-8 w-auto sm:h-9 lg:h-11"
            alt="CampusCare"
          />
          <h2 className="mt-5 text-balance text-2xl font-bold tracking-tight sm:mt-6 sm:text-3xl lg:text-4xl">
            Why CampusCare?
          </h2>
          <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-blue-100 sm:mt-4 sm:text-base lg:text-lg">
            Built for how the Health Services Office already works — records,
            queues, and clinic devices in one place.
          </p>
        </div>
        <p className="mt-8 text-xs font-medium text-blue-200 sm:mt-10 sm:text-sm">
          NU Dasmariñas · Health Services Office
        </p>
      </motion.div>

      <motion.ul
        className="flex min-w-0 flex-col justify-center rounded-2xl border border-slate-200/90 bg-white px-4 py-1 sm:rounded-[1.75rem] sm:px-6 sm:py-2 lg:rounded-[2rem] lg:px-7 lg:py-3"
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
              className="flex min-w-0 gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:gap-4 sm:py-5 lg:py-6"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:size-10 lg:size-11">
                <Icon className="size-4 sm:size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base lg:text-[17px]">
                  {point.title}
                </h3>
                <p className="mt-1 text-pretty text-[13px] leading-relaxed text-slate-500 sm:text-sm">
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
