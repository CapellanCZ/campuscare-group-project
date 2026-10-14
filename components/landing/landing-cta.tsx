"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"
import { IconArrowRight } from "@tabler/icons-react"

import { useMotionReady } from "@/components/landing/use-motion-ready"
import { Button } from "@/components/ui/button"
import { ctaCopy } from "@/lib/landing/content"
import { siteRoutes } from "@/lib/site/routes"

export function LandingCta() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const inView = useInView(sectionRef, { amount: 0.45 })
  const { allowMotion } = useMotionReady()

  return (
    <section
      ref={sectionRef}
      id="get-started"
      className="scroll-mt-20 border-b border-slate-200/80 bg-gradient-to-b from-blue-600 to-blue-700"
    >
      <motion.div
        className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20"
        initial={false}
        animate={
          allowMotion
            ? {
                scale: inView ? 1.02 : 0.985,
                opacity: inView ? 1 : 0.92,
              }
            : undefined
        }
        transition={{ type: "spring", stiffness: 220, damping: 28 }}
      >
        <h2 className="max-w-2xl text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
          {ctaCopy.title}
        </h2>
        <p className="max-w-xl text-pretty text-base text-blue-100 sm:text-lg">
          {ctaCopy.description}
        </p>
        <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row">
          <Button
            size="lg"
            className="w-full rounded-full bg-white px-6 text-blue-700 hover:bg-blue-50 sm:w-auto"
            render={<Link href={siteRoutes.login} />}
            nativeButton={false}
          >
            {ctaCopy.primaryCta}
            <IconArrowRight data-icon="inline-end" className="size-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full rounded-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
            render={<Link href={siteRoutes.login} />}
            nativeButton={false}
          >
            {ctaCopy.secondaryCta}
          </Button>
        </div>
      </motion.div>
    </section>
  )
}
