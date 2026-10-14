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
        className="border-l-2 border-blue-600 pl-5 sm:pl-6"
        initial={allowMotion ? { opacity: 0, y: 16 } : false}
        whileInView={allowMotion ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease }}
      >
        <p className="text-pretty text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl sm:leading-snug">
          {aboutCopy.mission}
        </p>
        <footer className="mt-4 text-sm text-slate-500">
          {aboutCopy.missionLabel}
        </footer>
      </motion.blockquote>

      <ol className="mt-10 border-t border-slate-200 sm:mt-12">
        {aboutCopy.highlights.map((item, index) => (
          <motion.li
            key={item.title}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b border-slate-200 py-5 sm:gap-4 sm:py-6"
            initial={allowMotion ? { opacity: 0, y: 12 } : false}
            whileInView={allowMotion ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: 0.4,
              delay: 0.1 + index * 0.07,
              ease,
            }}
          >
            <span className="pt-0.5 font-mono text-xs font-medium tracking-wide text-blue-600 tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900">
                {item.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {item.description}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </aside>
  )
}
