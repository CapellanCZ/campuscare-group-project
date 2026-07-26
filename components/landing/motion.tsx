"use client"

import { useEffect, useState, type ReactNode } from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react"

import { cn } from "@/lib/utils"

type RevealProps = HTMLMotionProps<"div"> & {
  children: ReactNode
  className?: string
  delay?: number
}

export function Reveal({
  children,
  className,
  delay = 0,
  ...props
}: RevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function ScrollFadeSection({
  children,
  className,
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <section id={id} className={className}>
        {children}
      </section>
    )
  }

  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0.35, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.15, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  )
}

export function TextRotator({
  phrases,
  className,
}: {
  phrases: string[]
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion || phrases.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length)
    }, 3200)
    return () => window.clearInterval(timer)
  }, [phrases.length, reduceMotion])

  if (reduceMotion) {
    return <p className={className}>{phrases[0]}</p>
  }

  return (
    <div className={cn("relative min-h-6 overflow-hidden", className)}>
      <AnimatePresence mode="wait">
        <motion.p
          key={phrases[index]}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-sm font-medium text-primary md:text-base"
        >
          {phrases[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

export function FloatingOrb({
  className,
  duration = 10,
}: {
  className?: string
  duration?: number
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div aria-hidden className={cn("absolute rounded-full", className)} />
  }

  return (
    <motion.div
      aria-hidden
      className={cn("absolute rounded-full", className)}
      animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  )
}

export function Float({
  children,
  className,
  duration = 6,
  y = 12,
}: {
  children: ReactNode
  className?: string
  duration?: number
  y?: number
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -y, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: "smooth", block: "start" })
}
