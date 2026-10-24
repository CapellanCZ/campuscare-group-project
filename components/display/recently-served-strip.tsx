"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { relativeTimeFrom } from "@/lib/health/time"
import type { RecentlyServedItem } from "@/lib/health/types"

function displayTicketCode(label: string) {
  return label.replace(/^ticket\s+/i, "").trim() || label
}

/**
 * Footer ticker for the public board — one reading line, not chip cards.
 */
export function RecentlyServedStrip({
  items,
}: {
  items: RecentlyServedItem[]
}) {
  const reduceMotion = useReducedMotion()
  const rows = items.slice(0, 8)

  return (
    <footer className="shrink-0 border-t border-[var(--qd-line)] bg-[var(--qd-ink)]">
      <div className="flex items-stretch">
        <div className="flex shrink-0 items-center border-r border-[var(--qd-line)] px-5 py-4 sm:min-w-[8.5rem] sm:px-7 sm:py-5">
          <p className="text-sm font-bold tracking-[0.14em] text-[var(--qd-mute)] uppercase sm:text-base">
            Served
          </p>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
          {rows.length === 0 ? (
            <p className="flex h-full items-center text-base text-[var(--qd-fg-faint)]">
              No completed tickets yet
            </p>
          ) : (
            <ul className="flex h-full min-w-0 items-center gap-0 overflow-x-auto">
              <AnimatePresence initial={false} mode="popLayout">
                {rows.map((item, index) => (
                  <motion.li
                    key={item.ticketId}
                    layout={!reduceMotion}
                    initial={
                      reduceMotion ? false : { opacity: 0, x: 24 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      reduceMotion ? undefined : { opacity: 0, x: -16 }
                    }
                    transition={{
                      duration: 0.24,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                    className="flex shrink-0 items-center"
                  >
                    {index > 0 ? (
                      <span
                        aria-hidden
                        className="mx-4 h-8 w-px bg-[var(--qd-line)] sm:mx-5"
                      />
                    ) : null}
                    <div className="flex items-baseline gap-3 sm:gap-4">
                      <span className="font-mono text-2xl font-bold tracking-tight text-[var(--qd-ticket)] tabular-nums sm:text-3xl">
                        {displayTicketCode(item.ticketLabel)}
                      </span>
                      <span className="flex items-baseline gap-2 sm:gap-2.5">
                        <span className="text-base font-semibold text-[var(--qd-fg)] sm:text-lg">
                          {item.stationLabel}
                        </span>
                        <span className="text-sm text-[var(--qd-mute)] tabular-nums sm:text-base">
                          {item.servedAt
                            ? relativeTimeFrom(item.servedAt)
                            : "Just now"}
                        </span>
                      </span>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </footer>
  )
}
