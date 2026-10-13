"use client"

import { IconCircleCheck, IconStack2 } from "@tabler/icons-react"

import { NurseDashboardPreview } from "@/components/landing/nurse-dashboard-preview"
import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import { landingViewportSection } from "@/components/landing/section-shell"
import { features } from "@/lib/landing/content"
import { cn } from "@/lib/utils"

const featureHighlights = features.slice(0, 3).map((f) => f.title)

export function LandingFeatures() {
  return (
    <ScrollFadeSection
      id="features"
      className={cn(
        landingViewportSection,
        "scroll-mt-20 overflow-x-clip border-b border-slate-200/80 bg-slate-50/80"
      )}
    >
      <div className="relative flex w-full flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-0 lg:pl-[max(1rem,calc((100%-80rem)/2+1rem))] lg:pr-0">
        <div className="w-full min-w-0 max-w-xl space-y-5 px-4 text-left sm:space-y-6 sm:px-6 lg:max-w-[28rem] lg:shrink-0 xl:max-w-[32rem] xl:pr-10">
          <Reveal>
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:size-14">
              <IconStack2 className="size-6 sm:size-7" aria-hidden />
            </span>
          </Reveal>
          <Reveal delay={0.04}>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Everything your team needs
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="max-w-lg text-pretty text-base text-slate-600 sm:text-lg md:text-xl">
              Practical tools for consultation flow, documentation, and campus
              health communication—built for the NU Dasmariñas Health Services
              Office.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <ul className="space-y-3 sm:space-y-4">
              {featureHighlights.map((label) => (
                <li
                  key={label}
                  className="flex items-start gap-3 text-sm font-medium text-slate-800 sm:text-base md:text-lg"
                >
                  <IconCircleCheck
                    className="mt-0.5 size-5 shrink-0 text-blue-600 sm:size-6"
                    aria-hidden
                  />
                  <span className="min-w-0 text-pretty">{label}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal
          delay={0.1}
          className="w-full min-w-0 px-4 sm:px-6 lg:flex-1 lg:flex lg:justify-end lg:self-stretch lg:px-0 lg:pl-6"
        >
          <NurseDashboardPreview edge />
        </Reveal>
      </div>
    </ScrollFadeSection>
  )
}
