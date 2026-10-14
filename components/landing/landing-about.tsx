"use client"

import { AboutHighlights } from "@/components/landing/about-highlights"
import { Reveal } from "@/components/landing/motion"
import { aboutCopy } from "@/lib/landing/content"

/** About — editorial copy left (revealed), mission charter right (staggered). */
export function LandingAbout() {
  return (
    <section
      id="about"
      className="scroll-mt-20 border-b border-slate-200/80 bg-white"
    >
      <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-4 py-14 sm:px-6 sm:py-16 md:py-24 lg:grid-cols-2 lg:gap-20">
        <div className="min-w-0 max-w-xl">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.16em] text-blue-600 uppercase">
              {aboutCopy.eyebrow}
            </p>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {aboutCopy.title}
            </h2>
          </Reveal>
          <div className="mt-6 space-y-4">
            {aboutCopy.body.map((paragraph, index) => (
              <Reveal key={paragraph.slice(0, 24)} delay={0.08 + index * 0.06}>
                <p className="text-pretty text-[15px] leading-relaxed text-slate-600 sm:text-base">
                  {paragraph}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        <AboutHighlights />
      </div>
    </section>
  )
}
