"use client"

import { useMemo } from "react"
import { IconHeartbeat } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

const ENCOURAGEMENTS = [
  "Steady hands. Clear vitals. You've got this shift.",
  "Every patient starts with you — take it one ticket at a time.",
  "Keep the queue calm. The clinic moves with your care.",
  "Welcome back. Ready when they are.",
  "Small checks, big difference. You're the front line of care.",
] as const

function pickEncouragement(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % ENCOURAGEMENTS.length
  }
  return ENCOURAGEMENTS[hash] ?? ENCOURAGEMENTS[0]
}

/**
 * Full-viewport blur while nurse Supabase data hydrates after login.
 */
export function NurseWelcomeLoader({
  open,
  nurseName,
  className,
}: {
  open: boolean
  nurseName?: string | null
  className?: string
}) {
  const firstName = nurseName?.trim().split(/\s+/).filter(Boolean)[0] ?? null
  const message = useMemo(
    () => pickEncouragement(firstName ?? "nurse"),
    [firstName]
  )

  if (!open) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center",
        "bg-background/50 backdrop-blur-md",
        "animate-in fade-in-0 duration-300",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby="nurse-welcome-title"
    >
      <div className="mx-6 flex max-w-md flex-col items-center gap-5 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden
        >
          <IconHeartbeat className="size-6 animate-pulse" stroke={1.75} />
        </div>
        <div className="space-y-2">
          <p
            id="nurse-welcome-title"
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </p>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {message}
          </p>
          <p className="pt-1 text-xs text-muted-foreground/80">
            Loading your clinic queue…
          </p>
        </div>
      </div>
    </div>
  )
}
