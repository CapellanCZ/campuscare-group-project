"use client"

import type { ReactNode } from "react"

import { HeroModuleChip } from "@/components/landing/hero-module-chip"
import { heroModuleChips } from "@/lib/landing/content"
import { cn } from "@/lib/utils"

type HeroPreviewOrbitProps = {
  children: ReactNode
  className?: string
}

/**
 * Organic scatter — uneven heights/depths so it doesn’t read as a tidy column pair.
 * Order matches heroModuleChips: Consultations, Queue, Records, Certificates.
 */
const chipSlots = [
  // Consultations — stacked above Records on the left
  "left-0 bottom-[28%] -translate-x-[6%] -rotate-12 sm:-translate-x-[18%] lg:bottom-[30%] lg:-translate-x-[28%]",
  // Queue — mid-high right, further out
  "right-0 top-[20%] translate-x-[10%] rotate-[-4deg] sm:translate-x-[20%] lg:translate-x-[38%]",
  // Records — low-left
  "left-0 bottom-[10%] -translate-x-[6%] rotate-[4deg] sm:-translate-x-[18%] lg:bottom-[12%] lg:-translate-x-[28%]",
  // Certificates — bottom-right tuck
  "right-0 bottom-[8%] translate-x-[4%] rotate-[3deg] sm:translate-x-[12%] lg:translate-x-[22%]",
] as const

/** Off-beat float phases so chips don’t bob in lockstep. */
const floatPhases = [1.2, 0.4, 2.3, 1.7] as const

/**
 * Wraps the product preview and orbits module chips around it.
 */
export function HeroPreviewOrbit({ children, className }: HeroPreviewOrbitProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative z-10">{children}</div>

      <ul
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 hidden sm:block"
      >
        {heroModuleChips.map((chip, index) => (
          <li
            key={chip.label}
            className={cn("absolute", chipSlots[index])}
          >
            <HeroModuleChip
              label={chip.label}
              icon={chip.icon}
              floatDelay={floatPhases[index]}
            />
          </li>
        ))}
      </ul>

      {/* Mobile: compact chip row under the preview — absolute orbit overflows small viewports. */}
      <ul className="mt-4 flex flex-wrap justify-center gap-2 sm:hidden">
        {heroModuleChips.map((chip) => (
          <li key={chip.label}>
            <HeroModuleChip label={chip.label} icon={chip.icon} />
          </li>
        ))}
      </ul>
    </div>
  )
}
