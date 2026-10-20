"use client"

import { useEffect, useRef, useState } from "react"
import { animate } from "motion/react"
import { cn } from "@/lib/utils"

/** Animates integer transitions for live KPI / queue counts. */
export function AnimatedCount({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
  const [display, setDisplay] = useState(safeValue)
  const [bump, setBump] = useState(false)
  const previous = useRef(safeValue)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      previous.current = safeValue
      setDisplay(safeValue)
      return
    }
    if (previous.current === safeValue) return

    const from = previous.current
    previous.current = safeValue
    setBump(true)
    const bumpTimer = window.setTimeout(() => setBump(false), 420)

    const controls = animate(from, safeValue, {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    })

    return () => {
      controls.stop()
      window.clearTimeout(bumpTimer)
    }
  }, [safeValue])

  return (
    <span
      className={cn(
        "inline-block tabular-nums transition-transform duration-300 ease-out",
        bump && "scale-110",
        className
      )}
    >
      {display}
    </span>
  )
}
