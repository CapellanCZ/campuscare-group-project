"use client"

import { useEffect, useState } from "react"

import { CLINIC_TIMEZONE } from "@/features/physician/types"

function partsInClinic(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-PH", {
    timeZone: CLINIC_TIMEZONE,
    hour: "numeric",
    hour12: false,
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    minute: "2-digit",
  })
  const bag = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value])
  )
  const hour = Number(bag.hour ?? "0")
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const dateLabel = `${bag.weekday}, ${bag.month} ${bag.day}, ${bag.year}`
  const timeLabel = new Intl.DateTimeFormat("en-PH", {
    timeZone: CLINIC_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now)
  return { greeting, dateLabel, timeLabel }
}

export function nurseGreetingTitle(firstName: string, now = new Date()) {
  const { greeting } = partsInClinic(now)
  return `${greeting}, ${firstName}`
}

/** Live clinic clock. `suppressHydrationWarning` covers SSR/client minute skew. */
export function ClinicDateTime({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const { dateLabel, timeLabel } = partsInClinic(now)

  return (
    <span className={className} aria-live="polite" suppressHydrationWarning>
      {dateLabel} · {timeLabel}
    </span>
  )
}

/** Time-of-day greeting; suppress warning for SSR/client clock skew. */
export function NurseGreetingTitle({ firstName }: { firstName: string }) {
  return (
    <span suppressHydrationWarning>{nurseGreetingTitle(firstName)}</span>
  )
}
