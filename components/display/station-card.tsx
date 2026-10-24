"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import type { StationBoard } from "@/lib/health/types"
import { formatResumeClock } from "@/lib/health/time"
import { cn } from "@/lib/utils"

function servingState(board: StationBoard) {
  if (board.status === "on_break") {
    const resume = formatResumeClock(board.resumesAt)
    return {
      kind: "break" as const,
      ticket: null,
      caption: resume ? `Break · back ~${resume}` : "On break",
    }
  }
  if (board.nowServing) {
    return {
      kind: "live" as const,
      ticket: board.nowServing,
      caption: "Please proceed",
    }
  }
  if (board.status === "not_available") {
    return {
      kind: "idle" as const,
      ticket: null,
      caption: "Station closed",
    }
  }
  return {
    kind: "idle" as const,
    ticket: null,
    caption:
      board.waitingCount > 0
        ? `${board.waitingCount} in line`
        : "No one waiting",
  }
}

export function StationCard({
  board,
  isLast = false,
}: {
  board: StationBoard
  isLast?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const state = servingState(board)
  const live = state.kind === "live"
  const onBreak = state.kind === "break"
  const ticketKey = board.nowServingCallKey ?? board.nowServing ?? "idle"

  return (
    <section
      className={cn(
        "relative flex min-h-0 flex-col px-5 py-6 sm:px-7 sm:py-8",
        !isLast &&
          "border-b border-[var(--qd-line)] lg:border-r lg:border-b-0"
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute top-0 left-0 h-full w-[3px] transition-colors duration-300",
          live && "bg-[var(--qd-signal)]",
          onBreak && "bg-[var(--qd-break)]",
          !live && !onBreak && "bg-transparent"
        )}
      />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--qd-mute)] uppercase sm:text-sm">
            Station
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--qd-fg)] sm:text-4xl lg:text-5xl">
            {board.label}
          </h2>
        </div>
        <motion.p
          key={live ? "calling" : onBreak ? "break" : board.status}
          initial={reduceMotion ? false : { opacity: 0.5, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            "mt-1 shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold tracking-wide sm:text-base",
            live && "bg-[var(--qd-signal)] text-white",
            onBreak && "bg-[var(--qd-break)] text-[#0C1222]",
            !live && !onBreak && "text-[var(--qd-mute)]"
          )}
        >
          {onBreak
            ? "Break"
            : live
              ? "Calling"
              : board.status === "available"
                ? "Open"
                : "Closed"}
        </motion.p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-start justify-center py-8 sm:py-10">
        <p className="mb-3 text-sm font-semibold tracking-[0.14em] text-[var(--qd-mute)] uppercase">
          Now serving
        </p>

        <div className="relative min-h-[clamp(3.5rem,8vw,6.5rem)] w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={ticketKey}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -14 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              className={cn(
                "font-mono text-[clamp(3.5rem,8vw,6.5rem)] leading-none font-semibold tracking-tight tabular-nums",
                live &&
                  "text-[var(--qd-ticket)] [text-shadow:0_0_40px_var(--qd-glow)]",
                onBreak && "text-[var(--qd-break)]",
                !live && !onBreak && "text-[var(--qd-fg-faint)]"
              )}
            >
              {state.ticket ?? "—"}
            </motion.p>
          </AnimatePresence>
        </div>

        {live && !reduceMotion ? (
          <motion.span
            aria-hidden
            className="mt-3 h-1 w-16 rounded-full bg-[var(--qd-signal)]"
            animate={{ opacity: [0.35, 1, 0.35], scaleX: [0.85, 1, 0.85] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={state.caption}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "mt-4 text-base font-medium tracking-wide sm:text-lg",
              live ? "text-[var(--qd-signal)]" : "text-[var(--qd-mute)]"
            )}
          >
            {state.caption}
          </motion.p>
        </AnimatePresence>
      </div>

      <footer className="border-t border-[var(--qd-line)] pt-4">
        <p className="mb-2.5 text-sm font-semibold tracking-[0.14em] text-[var(--qd-mute)] uppercase">
          Up next
        </p>
        {board.upcoming.length === 0 ? (
          <p className="font-mono text-xl text-[var(--qd-fg-faint)] tabular-nums">
            —
          </p>
        ) : (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <AnimatePresence initial={false} mode="popLayout">
              {board.upcoming.map((ticket, index) => (
                <motion.li
                  key={ticket}
                  layout={!reduceMotion}
                  initial={
                    reduceMotion ? false : { opacity: 0, y: 8 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className={cn(
                    "font-mono text-2xl font-semibold tabular-nums sm:text-3xl",
                    index === 0
                      ? "text-[var(--qd-ticket)]"
                      : "text-[var(--qd-fg-dim)]"
                  )}
                >
                  {ticket}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </footer>
    </section>
  )
}
