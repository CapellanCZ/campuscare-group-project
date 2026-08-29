"use client"

import { IconClock } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SessionLockOverlay({
  pending,
  onContinue,
}: {
  pending?: boolean
  onContinue: () => void
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-center justify-center",
        "pointer-events-auto bg-background/55 backdrop-blur-md"
      )}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-lock-title"
    >
      <div className="pointer-events-auto mx-4 flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border-2 border-border bg-background px-8 py-10 text-center shadow-lg">
        <div className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning">
          <IconClock className="size-8" aria-hidden />
        </div>
        <div className="space-y-2">
          <p
            id="session-lock-title"
            className="text-xl font-semibold text-foreground"
          >
            Session Locked
          </p>
          <p className="text-sm text-muted-foreground">
            Your session was locked due to inactivity. Select Continue Session
            to resume your work.
          </p>
        </div>
        <Button size="lg" disabled={pending} onClick={onContinue}>
          Continue Session
        </Button>
      </div>
    </div>
  )
}
