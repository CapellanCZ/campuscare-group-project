"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"

/** Avoid SSR/client mismatches from `useReducedMotion` before mount. */
export function useMotionReady() {
  const [ready, setReady] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    setReady(true)
  }, [])

  return {
    ready,
    /** True only after mount when the user prefers reduced motion. */
    reduceMotion: ready && !!prefersReducedMotion,
    /** Decorative motion layers should render only when ready and motion is allowed. */
    allowMotion: ready && !prefersReducedMotion,
  }
}
