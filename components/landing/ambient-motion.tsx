"use client"

import { motion, useScroll, useTransform } from "motion/react"

import { useMotionReady } from "@/components/landing/use-motion-ready"

const FLOAT_DOTS = [
  { left: "10%", top: "16%", size: 7, duration: 8, delay: 0, color: "bg-sky-400/70" },
  { left: "76%", top: "26%", size: 9, duration: 10, delay: 1.1, color: "bg-blue-500/55" },
  { left: "20%", top: "58%", size: 6, duration: 7.5, delay: 0.5, color: "bg-cyan-400/65" },
  { left: "86%", top: "70%", size: 8, duration: 9.5, delay: 1.6, color: "bg-[#2563EB]/50" },
  { left: "48%", top: "38%", size: 5, duration: 11, delay: 2.2, color: "bg-sky-300/60" },
] as const

export function AmbientMotion() {
  const { allowMotion } = useMotionReady()
  const { scrollYProgress } = useScroll()
  const driftY = useTransform(scrollYProgress, [0, 1], [0, -90])
  const driftOpacity = useTransform(
    scrollYProgress,
    [0, 0.25, 0.65, 1],
    [0.55, 0.75, 0.55, 0.35]
  )
  const dashOffset = useTransform(scrollYProgress, [0, 1], [0, -120])

  if (!allowMotion) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[6] overflow-hidden"
    >
      <motion.svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        fill="none"
        style={{ y: driftY, opacity: driftOpacity }}
      >
        <motion.path
          d="M-40 140 L 480 20"
          stroke="rgba(14, 165, 233, 0.28)"
          strokeWidth="1.5"
          strokeDasharray="8 16"
          style={{ strokeDashoffset: dashOffset }}
        />
        <motion.path
          d="M180 460 L 820 240"
          stroke="rgba(37, 99, 235, 0.22)"
          strokeWidth="1.35"
          strokeDasharray="6 18"
          style={{ strokeDashoffset: dashOffset }}
        />
        <motion.path
          d="M-10 700 L 620 480"
          stroke="rgba(34, 211, 238, 0.24)"
          strokeWidth="1.25"
          strokeDasharray="5 20"
          style={{ strokeDashoffset: dashOffset }}
        />
      </motion.svg>

      {FLOAT_DOTS.map((dot) => (
        <motion.span
          key={`${dot.left}-${dot.top}`}
          className={`absolute rounded-full shadow-[0_0_12px_rgba(56,189,248,0.45)] ${dot.color}`}
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            y: [0, -16, 0, 12, 0],
            x: [0, 8, 0, -6, 0],
            opacity: [0.4, 0.9, 0.5, 0.85, 0.4],
            scale: [1, 1.15, 1, 1.08, 1],
          }}
          transition={{
            duration: dot.duration,
            delay: dot.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
