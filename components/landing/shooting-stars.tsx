"use client"

import { motion } from "motion/react"

import { useMotionReady } from "@/components/landing/use-motion-ready"

type StarConfig = {
  top: string
  left: string
  delay: number
  duration: number
  repeatDelay: number
  width: number
  angle: number
  tone: "blue" | "sky" | "cyan"
}

const STARS: StarConfig[] = [
  {
    top: "8%",
    left: "-10%",
    delay: 0.1,
    duration: 1.15,
    repeatDelay: 2.8,
    width: 130,
    angle: -30,
    tone: "sky",
  },
  {
    top: "20%",
    left: "6%",
    delay: 1.2,
    duration: 1.35,
    repeatDelay: 3.2,
    width: 150,
    angle: -26,
    tone: "blue",
  },
  {
    top: "36%",
    left: "-6%",
    delay: 2.4,
    duration: 1.05,
    repeatDelay: 3.6,
    width: 110,
    angle: -34,
    tone: "cyan",
  },
  {
    top: "52%",
    left: "14%",
    delay: 0.7,
    duration: 1.45,
    repeatDelay: 3.1,
    width: 140,
    angle: -28,
    tone: "blue",
  },
  {
    top: "68%",
    left: "-4%",
    delay: 1.9,
    duration: 1.2,
    repeatDelay: 3.8,
    width: 120,
    angle: -32,
    tone: "sky",
  },
  {
    top: "82%",
    left: "10%",
    delay: 3.0,
    duration: 1.3,
    repeatDelay: 4.0,
    width: 100,
    angle: -29,
    tone: "cyan",
  },
]

const TONE_CLASS: Record<StarConfig["tone"], string> = {
  blue: "from-transparent via-[#2563EB] to-white",
  sky: "from-transparent via-sky-400 to-white",
  cyan: "from-transparent via-cyan-300 to-white",
}

export function ShootingStars() {
  const { allowMotion } = useMotionReady()

  if (!allowMotion) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[7] overflow-hidden"
    >
      {STARS.map((star) => (
        <motion.span
          key={`${star.top}-${star.delay}`}
          className={`absolute h-[2px] rounded-full bg-gradient-to-r shadow-[0_0_14px_rgba(56,189,248,0.75)] ${TONE_CLASS[star.tone]}`}
          style={{
            top: star.top,
            left: star.left,
            width: star.width,
            rotate: star.angle,
          }}
          initial={{ x: 0, opacity: 0 }}
          animate={{
            x: ["0vw", "120vw"],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            repeatDelay: star.repeatDelay,
            ease: [0.2, 0.75, 0.3, 1],
            times: [0, 0.1, 0.82, 1],
          }}
        />
      ))}
    </div>
  )
}
