"use client"

import { motion, useScroll, useSpring, useTransform } from "motion/react"

import { useMotionReady } from "@/components/landing/use-motion-ready"

/** Page-level scroll progress + color wash that shifts while scrolling. */
export function ScrollProgress() {
  const { allowMotion } = useMotionReady()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 30,
    mass: 0.2,
  })
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 130,
    damping: 28,
    mass: 0.25,
  })
  const washY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"])
  const washBY = useTransform(scrollYProgress, [0, 1], ["40%", "8%"])
  const washOpacity = useTransform(scrollYProgress, [0, 0.4, 1], [0.55, 0.7, 0.45])
  const orbAY = useTransform(scrollYProgress, [0, 1], [-80, 160])
  const orbAX = useTransform(scrollYProgress, [0, 1], [0, 40])
  const orbBY = useTransform(scrollYProgress, [0, 1], [60, -120])
  const orbBX = useTransform(scrollYProgress, [0, 1], [0, -30])
  const orbCY = useTransform(scrollYProgress, [0, 1], [20, -70])
  const orbAOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.35, 0.55, 0.3])
  const orbBOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.25, 0.45, 0.28])
  const orbCOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 0.4, 0.22])

  if (!allowMotion) return null

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed top-0 left-0 z-[70] h-1 w-full origin-left bg-gradient-to-r from-sky-500 via-[#2563EB] to-cyan-400"
        style={{ scaleX }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[20%] right-3 z-[70] hidden h-[55%] w-1 overflow-hidden rounded-full bg-sky-100 sm:block"
      >
        <motion.div
          className="h-full w-full origin-top rounded-full bg-gradient-to-b from-[#2563EB] via-sky-400 to-cyan-300"
          style={{ scaleY }}
        />
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[4] overflow-hidden"
        style={{ opacity: washOpacity }}
      >
        <motion.div
          className="absolute -left-1/4 h-[70vh] w-[70vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.28),transparent_68%)]"
          style={{ top: washY }}
        />
        <motion.div
          className="absolute -right-1/4 h-[65vh] w-[60vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.22),transparent_70%)]"
          style={{ top: washBY }}
        />
      </motion.div>

      <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
        <motion.div
          className="absolute -left-24 top-[12%] h-72 w-72 rounded-full bg-sky-300/40 blur-3xl"
          style={{ y: orbAY, x: orbAX, opacity: orbAOpacity }}
        />
        <motion.div
          className="absolute -right-20 top-[48%] h-80 w-80 rounded-full bg-blue-400/30 blur-3xl"
          style={{ y: orbBY, x: orbBX, opacity: orbBOpacity }}
        />
        <motion.div
          className="absolute top-[72%] left-[30%] h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl"
          style={{ y: orbCY, opacity: orbCOpacity }}
        />
      </div>
    </>
  )
}
