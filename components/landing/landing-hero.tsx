import Link from "next/link"
import { IconActivity, IconArrowRight } from "@tabler/icons-react"

import {
  landingSectionInner,
  landingViewportSection,
} from "@/components/landing/section-shell"
import { Button } from "@/components/ui/button"
import { features, heroCopy, heroRotatingPhrases } from "@/lib/landing/content"
import { siteRoutes } from "@/lib/site/routes"
import { cn } from "@/lib/utils"

/**
 * Reference-inspired hero: left copy + CTAs, right clinic-module cards
 * (CampusCare / HSO content only — not multi-office marketing).
 */
export function LandingHero() {
  const previewFeatures = features.slice(0, 3)

  return (
    <section
      id="home"
      className={cn(landingViewportSection, "relative")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_15%_0%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(700px_360px_at_90%_10%,rgba(14,165,233,0.1),transparent_50%)]"
      />

      <div
        className={cn(
          landingSectionInner,
          "relative grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12"
        )}
      >
        <div className="flex min-w-0 flex-col items-start text-left">
          <p className="inline-flex max-w-full items-start gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-left text-xs font-medium text-blue-700 sm:items-center sm:px-5 sm:py-2 sm:text-sm md:text-base">
            <IconActivity
              className="mt-0.5 size-4 shrink-0 sm:mt-0 sm:size-5"
              aria-hidden
            />
            <span className="min-w-0 text-pretty">
              Consultations, queues, and records in one workspace
            </span>
          </p>

          <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:mt-6 sm:text-4xl md:text-5xl lg:text-6xl lg:leading-[1.08]">
            {heroCopy.headline}
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
              <IconArrowRight data-icon="inline-end" className="size-4 sm:size-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-full border-slate-200 bg-white text-base text-slate-800 hover:bg-slate-50 sm:h-14 sm:w-auto sm:px-8 sm:text-lg"
              render={<a href="#about" />}
              nativeButton={false}
            >
              {heroCopy.secondaryCta}
            </Button>
          </div>
        </div>

        <div className="relative w-full min-w-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-500/10 via-transparent to-sky-400/10 blur-2xl sm:-inset-4"
          />
          <div className="relative rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_24px_60px_-28px_rgba(37,99,235,0.35)] sm:rounded-3xl sm:p-6 md:p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-blue-600 uppercase sm:text-xs">
                <span
                  className="size-2 shrink-0 rounded-full bg-emerald-500"
                  aria-hidden
                />
                Clinic modules connected
              </p>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 sm:px-3 sm:text-sm">
                {features.length} modules
              </span>
            </div>
            <ul className="space-y-3 sm:space-y-4">
              {previewFeatures.map((item) => {
                const Icon = item.icon
                return (
                  <li
                    key={item.title}
                    className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:size-12 sm:rounded-2xl">
                      <Icon className="size-5 sm:size-6" aria-hidden />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block text-base font-semibold text-slate-900 sm:text-lg">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-pretty text-slate-500 sm:text-base">
                        {item.description}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
