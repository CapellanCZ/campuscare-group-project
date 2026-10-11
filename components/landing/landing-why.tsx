import { IconCircleCheck } from "@tabler/icons-react"

import { Reveal, ScrollFadeSection } from "@/components/landing/motion"
import { whyUsPoints } from "@/lib/landing/content"

export function LandingWhy() {
  return (
    <ScrollFadeSection id="why-us" className="scroll-mt-20 border-b border-slate-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Why CampusCare?
            </h2>
          </Reveal>
        </div>

        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {whyUsPoints.map((point, index) => (
            <Reveal key={point.title} delay={0.05 * index}>
              <li className="flex h-full gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                <IconCircleCheck
                  className="mt-0.5 size-5 shrink-0 text-blue-600"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{point.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
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
