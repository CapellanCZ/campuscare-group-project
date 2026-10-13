import { IconCircleCheck } from "@tabler/icons-react"

import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import {
  landingSectionInner,
  landingViewportSection,
} from "@/components/landing/section-shell"
import { whyUsPoints } from "@/lib/landing/content"
import { cn } from "@/lib/utils"

export function LandingWhy() {
  return (
    <ScrollFadeSection
      id="why-us"
      className={cn(
        landingViewportSection,
        "scroll-mt-20 border-b border-slate-200/80 bg-white"
      )}
    >
      <div className={landingSectionInner}>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Why CampusCare?
            </h2>
          </Reveal>
        </div>

        <ul className="mx-auto mt-8 grid max-w-5xl gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:mt-12 lg:gap-6">
          {whyUsPoints.map((point, index) => (
            <Reveal key={point.title} delay={0.05 * index}>
              <li className="flex h-full gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 sm:gap-4 sm:rounded-3xl sm:p-6 md:p-7">
                <IconCircleCheck
                  className="mt-0.5 size-5 shrink-0 text-blue-600 sm:size-6 md:size-7"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 sm:text-lg md:text-xl">
                    {point.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:mt-2 sm:text-base">
                    {point.description}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </ScrollFadeSection>
  )
}
