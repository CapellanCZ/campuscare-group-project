"use client"

import type { ComponentType } from "react"
import { motion } from "motion/react"

import { useMotionReady } from "@/components/landing/use-motion-ready"
import { cn } from "@/lib/utils"

type HeroModuleChipProps = {
  label: string
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  className?: string
  /** Stagger float phase so chips don’t bob in sync. */
  floatDelay?: number
}

/**
 * White floating pill — blue icon disc + module label (hero orbit crumbs).
 */
export function HeroModuleChip({
  label,
  icon: Icon,
  className,
  floatDelay = 0,
}: HeroModuleChipProps) {
  const { allowMotion, ready } = useMotionReady()

  const chip = (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-1.5 text-sm font-semibold text-slate-800 shadow-[0_10px_28px_-12px_rgba(15,23,42,0.35),0_2px_8px_-2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70",
        className
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
        <Icon className="size-3.5" aria-hidden />
      </span>
      {label}
    </span>
  )

  if (!ready || !allowMotion) {
    return chip
  }

  return (
    <motion.span
      className="inline-flex will-change-transform"
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -6, 0],
      }}
      transition={{
        opacity: { duration: 0.45, delay: 0.2 + floatDelay * 0.08, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.45, delay: 0.2 + floatDelay * 0.08, ease: [0.22, 1, 0.36, 1] },
        y: {
          duration: 4.2 + floatDelay * 0.35,
          repeat: Infinity,
          ease: "easeInOut",
          delay: floatDelay * 0.4,
        },
      }}
    >
      {chip}
    </motion.span>
  )
}
