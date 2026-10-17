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
import { Button } from "@/components/ui/button"
import { heroCopy, heroRotatingPhrases } from "@/lib/landing/content"
import { siteRoutes } from "@/lib/site/routes"
import { cn } from "@/lib/utils"

/**
 * Mobile: copy-first hero (no scaled dashboard).
 * Desktop (lg+): copy + floating nurse preview with module chips.
 * Constrained to max-w-7xl so the composition holds on wide monitors.
 */
export function LandingHero() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const { allowMotion } = useMotionReady()
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })
  const previewY = useTransform(scrollYProgress, [0, 1], [0, 56])

  return (
    <section
      ref={sectionRef}
      id="home"
      className={cn(
        "relative flex scroll-mt-20 overflow-x-clip",
        "min-h-[calc(100dvh-3.5rem)] items-center py-10 sm:min-h-[calc(100dvh-4rem)] sm:py-12",
        "lg:py-8 xl:py-10"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_15%_0%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(700px_360px_at_90%_10%,rgba(14,165,233,0.1),transparent_50%)]"
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col lg:flex-row lg:items-center lg:gap-8 xl:gap-12">
        <div className="flex w-full min-w-0 flex-col items-start px-4 text-left sm:px-6 lg:w-[min(100%,30rem)] lg:shrink-0 lg:px-8 xl:w-[min(100%,34rem)]">
          <p className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700 min-[380px]:px-3 min-[380px]:py-1.5 min-[380px]:text-[11px] sm:gap-2 sm:px-4 sm:text-xs lg:text-[13px]">
            <IconActivity
              className="size-3 shrink-0 min-[380px]:size-3.5 sm:size-4"
              aria-hidden
            />
            <span className="whitespace-nowrap">
              Consultations, queues, and records in one workspace
            </span>
          </p>

          <h1 className="mt-4 text-pretty text-[1.625rem] font-bold leading-[1.15] tracking-tight text-slate-900 sm:mt-5 sm:text-[2rem] lg:max-w-[13.5em] lg:text-[2.15rem] lg:leading-[1.12] xl:max-w-none xl:text-[2.55rem] 2xl:text-[2.85rem]">
            {heroCopy.headline.replace(/\bclarity\b/i, "").trimEnd()}{" "}
            <RevealWord text="clarity" className="text-slate-900" />
          </h1>
          <p className="mt-2.5 text-pretty text-sm font-medium text-blue-600 sm:text-base lg:text-[0.9375rem] xl:text-lg">
            {heroRotatingPhrases[0]}
          </p>
          <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-slate-600 sm:mt-3.5 sm:text-[0.9375rem] lg:max-w-lg xl:text-base">
            {heroCopy.description}
          </p>

          <div className="mt-6 flex w-full flex-col items-stretch gap-2.5 sm:mt-7 sm:flex-row sm:items-center sm:gap-3">
            <Button
              size="default"
              className="h-10 w-full rounded-full bg-blue-600 px-5 text-sm hover:bg-blue-700 sm:h-11 sm:w-auto sm:px-6 sm:text-[0.9375rem]"
              render={<Link href={siteRoutes.login} />}
              nativeButton={false}
            >
              {heroCopy.primaryCta}
              <IconArrowRight
                data-icon="inline-end"
                className="size-4"
              />
            </Button>
            <Button
              size="default"
              variant="outline"
              className="h-10 w-full rounded-full border-slate-200 bg-white px-5 text-sm text-slate-800 hover:bg-slate-50 sm:h-11 sm:w-auto sm:px-6 sm:text-[0.9375rem]"
              type="button"
              onClick={() => scrollToId("about")}
            >
              {heroCopy.secondaryCta}
            </Button>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 px-4 sm:px-6 lg:block lg:px-8 lg:pr-10">
          {allowMotion ? (
            <motion.div
              style={{ y: previewY }}
              className="w-full will-change-transform"
            >
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
