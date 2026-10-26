import type { ReactNode } from "react"

/** Shared UI typing for dashboard stat cards (live metrics, not fixtures). */

export type DemoStat = {
  key: string
  label: string
  value: string
  description?: string
  icon?: ReactNode
  /** Tailwind classes for the icon (e.g. text-emerald-600). */
  iconClassName?: string
  /** Blue + bump — only while the metric is newly increased vs the seen baseline. */
  highlight?: boolean
}
