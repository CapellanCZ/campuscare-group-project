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
 * Organic scatter kept inside the preview column so chips don’t clip the viewport.
 * Order matches heroModuleChips: Consultations, Queue, Records, Certificates.
 */
const chipSlots = [
  // Consultations — mid-left
  "left-0 bottom-[30%] -translate-x-[4%] -rotate-12 sm:-translate-x-[10%] lg:bottom-[32%] lg:-translate-x-[14%]",
  // Queue — mid-high right
  "right-0 top-[18%] translate-x-[4%] rotate-[-4deg] sm:translate-x-[10%] lg:translate-x-[12%]",
  // Records — low-left
  "left-0 bottom-[8%] -translate-x-[4%] rotate-[4deg] sm:-translate-x-[10%] lg:bottom-[10%] lg:-translate-x-[14%]",
  // Certificates — bottom-right tuck
  "right-0 bottom-[6%] translate-x-[2%] rotate-[3deg] sm:translate-x-[8%] lg:translate-x-[10%]",
] as const

/** Off-beat float phases so chips don’t bob in lockstep. */
const floatPhases = [1.2, 0.4, 2.3, 1.7] as const

/**
 * Wraps the product preview and orbits module chips around it.
 */
export function HeroPreviewOrbit({ children, className }: HeroPreviewOrbitProps) {
  return (
    <div className={cn("relative w-full px-3 sm:px-5 lg:px-6", className)}>
      <div className="relative z-10">{children}</div>

      <ul
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
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

    </div>
  )
}
