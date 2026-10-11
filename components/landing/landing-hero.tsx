import Link from "next/link"
import {
  IconActivity,
  IconArrowRight,
  IconHeartRateMonitor,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { features, heroCopy, heroRotatingPhrases } from "@/lib/landing/content"
import { siteRoutes } from "@/lib/site/routes"

/**
 * Reference-inspired hero: left copy + CTAs, right clinic-module cards
 * (CampusCare / HSO content only — not multi-office marketing).
 */
export function LandingHero() {
  const previewFeatures = features.slice(0, 3)

  return (
    <section id="home" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_15%_0%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(700px_360px_at_90%_10%,rgba(14,165,233,0.1),transparent_50%)]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        <div className="flex flex-col items-start text-left">
          <div className="flex flex-col items-start gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-600 shadow-sm">
              <IconHeartRateMonitor className="size-3.5" aria-hidden />
              {heroCopy.eyebrow}
            </span>
            <span className="inline-flex max-w-full rounded-full border border-blue-200 bg-white px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-blue-600 uppercase sm:text-[11px]">
              {heroCopy.brand}
            </span>
          </div>

          <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            {heroCopy.headline}
          </h1>
          <p className="mt-3 text-base font-medium text-blue-600 sm:text-lg">
            {heroRotatingPhrases[0]}
          </p>
          <p className="mt-4 max-w-xl text-pretty text-base text-slate-600 sm:text-lg">
            {heroCopy.description}
          </p>

          <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="rounded-full bg-blue-600 px-6 shadow-[0_12px_28px_-12px_rgba(37,99,235,0.65)] hover:bg-blue-700"
              render={<Link href={siteRoutes.login} />}
              nativeButton={false}
            >
              {heroCopy.primaryCta}
              <IconArrowRight data-icon="inline-end" className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              render={<a href="#about" />}
              nativeButton={false}
            >
              {heroCopy.secondaryCta}
            </Button>
          </div>

          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <IconActivity className="size-3.5" aria-hidden />
            Consultations, queues, and records in one workspace
          </p>
        </div>

        <div className="relative w-full">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/10 via-transparent to-sky-400/10 blur-2xl"
          />
          <div className="relative rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(37,99,235,0.35)] sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-blue-600 uppercase">
                <span
                  className="size-2 rounded-full bg-emerald-500"
                  aria-hidden
                />
                Clinic modules connected
              </p>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {features.length} modules
              </span>
            </div>
            <ul className="space-y-3">
              {previewFeatures.map((item) => {
                const Icon = item.icon
                return (
                  <li
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block font-semibold text-slate-900">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-500">
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
