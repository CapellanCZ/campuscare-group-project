"use client"

import { motion } from "motion/react"

import { useMotionReady } from "@/components/landing/use-motion-ready"
import { cn } from "@/lib/utils"

type RevealWordProps = {
  text: string
  className?: string
}

/**
 * Soft per-letter blur → sharp settle. Calmer than scramble for brand headlines.
 */
export function RevealWord({ text, className }: RevealWordProps) {
  const { allowMotion, ready } = useMotionReady()
  const letters = Array.from(text)

  if (!ready || !allowMotion) {
    return <span className={cn(className)}>{text}</span>
  }

  return (
    <span
      className={cn("inline-flex whitespace-nowrap", className)}
      aria-label={text}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={`${letter}-${index}`}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: "0.35em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.55,
            delay: 0.35 + index * 0.055,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  )
}
