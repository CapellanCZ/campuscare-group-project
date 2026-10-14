"use client"

import { motion } from "motion/react"

import { useMotionReady } from "@/components/landing/use-motion-ready"
import { aboutCopy } from "@/lib/landing/content"
import { cn } from "@/lib/utils"

const ease = [0.22, 1, 0.36, 1] as const

/**
 * About right column — pull-quote + numbered charter.
 * No card stack, icon discs, or hover fills.
 */
export function AboutHighlights({ className }: { className?: string }) {
  const { allowMotion } = useMotionReady()

  return (
    <aside className={cn("min-w-0", className)}>
      <motion.blockquote
        className="border-l-2 border-blue-600 pl-4 sm:pl-6"
        initial={allowMotion ? { opacity: 0, y: 12 } : false}
        whileInView={allowMotion ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.5, ease }}
      >
        <p className="text-pretty text-lg font-semibold tracking-tight text-slate-900 sm:text-xl md:text-2xl sm:leading-snug">
          {aboutCopy.mission}
        </p>
        <footer className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm">
          {aboutCopy.missionLabel}
        </footer>
      </motion.blockquote>

      <ol className="mt-8 border-t border-slate-200 sm:mt-10 md:mt-12">
        {aboutCopy.highlights.map((item, index) => (
          <motion.li
            key={item.title}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2.5 border-b border-slate-200 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4 sm:py-5 md:py-6"
            initial={allowMotion ? { opacity: 0, y: 12 } : false}
            whileInView={allowMotion ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: 0.45,
              delay: 0.12 + index * 0.09,
              ease,
            }}
          >
            <span className="pt-0.5 font-mono text-[11px] font-medium tracking-wide text-blue-600 tabular-nums sm:text-xs">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 sm:text-base">
                {item.title}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500 sm:text-sm">
                {item.description}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </aside>
  )
}
