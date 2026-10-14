"use client"

import { useRef } from "react"
import Link from "next/link"
import {
  motion,
  useScroll,
  useTransform,
} from "motion/react"
import { IconActivity, IconArrowRight } from "@tabler/icons-react"

import { HeroPreviewOrbit } from "@/components/landing/hero-preview-orbit"
import { NurseDashboardPreview } from "@/components/landing/nurse-dashboard-preview"
import { RevealWord } from "@/components/landing/reveal-word"
import { scrollToId } from "@/components/landing/scroll-to-id"
import { useMotionReady } from "@/components/landing/use-motion-ready"
import { landingViewportSection } from "@/components/landing/section-shell"
import { Button } from "@/components/ui/button"
import { heroCopy, heroRotatingPhrases } from "@/lib/landing/content"
import { siteRoutes } from "@/lib/site/routes"
import { cn } from "@/lib/utils"

/**
 * Left copy + floating full nurse dashboard window on the right.
 */
export function LandingHero() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const { allowMotion } = useMotionReady()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })
  // Preview drifts slower than page scroll (~8% parallax).
  const previewY = useTransform(scrollYProgress, [0, 1], [0, 56])

  return (
    <section
      ref={sectionRef}
      id="home"
      className={cn(landingViewportSection, "relative overflow-x-clip")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_15%_0%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(700px_360px_at_90%_10%,rgba(14,165,233,0.1),transparent_50%)]"
      />

      <div className="relative flex w-full flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-0">
        <div className="flex w-full min-w-0 max-w-xl flex-col items-start px-4 text-left sm:px-6 lg:w-1/2 lg:max-w-none lg:shrink-0 lg:pl-[max(1rem,calc((100%-80rem)/2+1rem))] lg:pr-8 xl:pr-12">
          <p className="inline-flex max-w-full items-start gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-left text-xs font-medium text-blue-700 sm:items-center sm:px-5 sm:py-2 sm:text-sm md:text-base">
            <IconActivity
              className="mt-0.5 size-4 shrink-0 sm:mt-0 sm:size-5"
              aria-hidden
            />
            <span className="min-w-0 text-pretty">
              Consultations, queues, and records in one workspace
            </span>
          </p>

          <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:mt-6 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            {heroCopy.headline.replace(/\bclarity\b/i, "").trimEnd()}{" "}
            <RevealWord text="clarity" className="text-slate-900" />
          </h1>
          <p className="mt-3 text-pretty text-base font-medium text-blue-600 sm:text-lg md:text-xl">
            {heroRotatingPhrases[0]}
          </p>
          <p className="mt-4 max-w-xl text-pretty text-sm text-slate-600 sm:text-base md:text-lg">
            {heroCopy.description}
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 w-full rounded-full bg-blue-600 px-6 text-base hover:bg-blue-700 sm:h-14 sm:w-auto sm:px-8 sm:text-lg"
              render={<Link href={siteRoutes.login} />}
              nativeButton={false}
            >
              {heroCopy.primaryCta}
              <IconArrowRight
                data-icon="inline-end"
                className="size-4 sm:size-5"
              />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-full border-slate-200 bg-white text-base text-slate-800 hover:bg-slate-50 sm:h-14 sm:w-auto sm:px-8 sm:text-lg"
              type="button"
              onClick={() => scrollToId("about")}
            >
              {heroCopy.secondaryCta}
            </Button>
          </div>
        </div>

        <div className="flex w-full min-w-0 items-center justify-center px-4 sm:px-6 lg:w-1/2 lg:justify-start lg:self-center lg:px-0 lg:pr-10 lg:-translate-x-4 xl:pr-12 xl:-translate-x-6">
          {allowMotion ? (
            <motion.div style={{ y: previewY }} className="w-full will-change-transform">
              <HeroPreviewOrbit>
                <NurseDashboardPreview priority />
              </HeroPreviewOrbit>
            </motion.div>
          ) : (
            <HeroPreviewOrbit>
              <NurseDashboardPreview priority />
            </HeroPreviewOrbit>
          )}
        </div>
      </div>
    </section>
  )
}
