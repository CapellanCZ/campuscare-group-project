"use client"

import { useEffect, type ReactNode } from "react"
import Lenis from "lenis"
import "lenis/dist/lenis.css"

import { setLenisInstance } from "@/lib/scroll/lenis-store"

type LandingLenisProps = {
  children: ReactNode
}

/**
 * Landing-only Lenis. Imperative init — no React tree wrapping (keeps Base UI
 * ids stable). Always destroys cleanly so scroll never gets stuck.
 */
export function LandingLenis({ children }: LandingLenisProps) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      anchors: false,
      // Prefer duration-based programmatic scrolls over lerp catching.
      lerp: 0.1,
    })

    setLenisInstance(lenis)

    return () => {
      setLenisInstance(null)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
