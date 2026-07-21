"use client"

import type { ReactNode } from "react"
import { motion } from "motion/react"

import { useMotionReady } from "@/components/landing/use-motion-ready"

type FadeInProps = {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * Enter-on-scroll reveal. Keeps content fully opaque while visible
 * so the page never washes out to gray mid-scroll.
 */
export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const { allowMotion } = useMotionReady()

  if (!allowMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -6% 0px" }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
