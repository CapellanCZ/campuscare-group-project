"use client"

import { useMemo, type ComponentType } from "react"
import {
  IconDental,
  IconHeartbeat,
  IconStethoscope,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"

type WelcomeRole = "nurse" | "physician" | "dentist"

const COPY: Record<
  WelcomeRole,
  {
    Icon: ComponentType<{ className?: string; stroke?: number }>
    loadingLabel: string
    encouragements: readonly string[]
  }
> = {
  nurse: {
    Icon: IconHeartbeat,
    loadingLabel: "Loading your clinic queue…",
    encouragements: [
      "Steady hands. Clear vitals. You've got this shift.",
      "Every patient starts with you — take it one ticket at a time.",
      "Keep the queue calm. The clinic moves with your care.",
      "Welcome back. Ready when they are.",
      "Small checks, big difference. You're the front line of care.",
    ],
  },
  physician: {
    Icon: IconStethoscope,
    loadingLabel: "Loading your station queue…",
    encouragements: [
      "Clear calls. Focused visits. Your station is ready.",
      "One patient at a time — the waiting list will wait.",
      "Welcome back. Your clinic line is syncing now.",
      "Listen carefully. Treat thoroughly. You've got this.",
      "The queue is warming up — your patients are on the way.",
    ],
  },
  dentist: {
    Icon: IconDental,
    loadingLabel: "Loading your dental queue…",
    encouragements: [
      "Steady chairside care. Your dental line is almost ready.",
      "One smile at a time — start with the next ticket.",
      "Welcome back. Syncing patients for your station.",
      "Precision and calm — that's your dental floor today.",
      "Your waiting list is loading. Ready when they are.",
    ],
  },
}

function pickEncouragement(seed: string, lines: readonly string[]) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % lines.length
  }
  return lines[hash] ?? lines[0]
}

/**
 * Full-viewport blur while staff Supabase data hydrates after login / cold load.
 */
export function StaffWelcomeLoader({
  open,
  staffName,
  role,
  className,
}: {
  open: boolean
  staffName?: string | null
  role: WelcomeRole
  className?: string
}) {
  const firstName = staffName?.trim().split(/\s+/).filter(Boolean)[0] ?? null
  const copy = COPY[role]
  const Icon = copy.Icon
  const message = useMemo(
    () => pickEncouragement(firstName ?? role, copy.encouragements),
    [copy.encouragements, firstName, role]
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
      aria-labelledby="staff-welcome-title"
    >
      <div className="mx-6 flex max-w-md flex-col items-center gap-5 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="size-6 animate-pulse" stroke={1.75} />
        </div>
        <div className="space-y-2">
          <p
            id="staff-welcome-title"
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </p>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {message}
          </p>
          <p className="pt-1 text-xs text-muted-foreground/80">
            {copy.loadingLabel}
          </p>
        </div>
      </div>
    </div>
  )
}

/** @deprecated Prefer StaffWelcomeLoader with role="nurse" */
export function NurseWelcomeLoader({
  open,
  nurseName,
  className,
}: {
  open: boolean
  nurseName?: string | null
  className?: string
}) {
  return (
    <StaffWelcomeLoader
      open={open}
      staffName={nurseName}
      role="nurse"
      className={className}
    />
  )
}
