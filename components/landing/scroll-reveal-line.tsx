"use client"

import { motion } from "motion/react"

import { useMotionReady } from "@/components/landing/use-motion-ready"

type ScrollRevealLineProps = {
  className?: string
  centered?: boolean
}

export function ScrollRevealLine({
  className,
  centered = false,
}: ScrollRevealLineProps) {
  const { allowMotion } = useMotionReady()
  const staticClass = `mt-4 h-1 w-16 rounded-full bg-sky-400/70 ${centered ? "mx-auto" : ""} ${className ?? ""}`

  if (!allowMotion) {
    return <div aria-hidden className={staticClass} />
  }

  return (
    <motion.div
      aria-hidden
      className={`mt-4 h-1 origin-left rounded-full bg-gradient-to-r from-[#2563EB] via-sky-400 to-cyan-300 ${centered ? "mx-auto origin-center" : ""} ${className ?? ""}`}
      style={{ width: centered ? "4.75rem" : "5.75rem" }}
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    />
  )
}
