"use client"

import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react"

import { useOptionalBreakMode } from "@/components/availability/break-mode-context"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function OnBreakControl({ className }: { className?: string }) {
  const breakMode = useOptionalBreakMode()
  const { confirmPreset } = useConfirm()

  if (!breakMode?.mode) return null
  if (breakMode.active) return null
  if (breakMode.dutyStatus.status !== "available") return null

  const { pending, startBreak } = breakMode

  const handleStartBreak = () => {
    void confirmPreset("goOnBreak", {
      onConfirm: async () => {
        startBreak()
      },
    })
  }

  return (
    <div className={className}>
      <Button size="sm" variant="outline" disabled={pending} onClick={handleStartBreak}>
        <IconPlayerPause data-icon="inline-start" />
        Break
      </Button>
    </div>
  )
}

export function BreakModeOverlay() {
  const breakMode = useOptionalBreakMode()
  const { confirmPreset } = useConfirm()

  if (!breakMode?.active) return null

  const { pending, endBreak } = breakMode

  const handleResume = () => {
    void confirmPreset("resumeWork", {
      onConfirm: async () => {
        endBreak()
      },
    })
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-center justify-center",
        "pointer-events-auto bg-background/55 backdrop-blur-md"
      )}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="break-overlay-title"
    >
      <div className="pointer-events-auto mx-4 flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border-2 border-border bg-background px-8 py-10 text-center shadow-lg">
        <p
          id="break-overlay-title"
          className="text-2xl font-semibold tracking-[0.2em] text-foreground uppercase"
        >
          On Break
        </p>
        <Button size="lg" disabled={pending} onClick={handleResume}>
          <IconPlayerPlay data-icon="inline-start" />
          Resume Work
        </Button>
      </div>
    </div>
  )
}
