"use client"

import { useState } from "react"
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react"

import { useOptionalBreakMode } from "@/components/availability/break-mode-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function OnBreakControl({ className }: { className?: string }) {
  const breakMode = useOptionalBreakMode()
  const [confirmStartOpen, setConfirmStartOpen] = useState(false)

  if (!breakMode?.mode) return null
  if (breakMode.active) return null

  const { pending, error, startBreak } = breakMode

  return (
    <div className={className}>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => setConfirmStartOpen(true)}
      >
        <IconPlayerPause data-icon="inline-start" />
        Break
      </Button>

      <Dialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Go on break?</DialogTitle>
            <DialogDescription>
              Are you sure you want to go on break? Clinic actions will be paused
              until you resume work.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStartOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                startBreak()
                setConfirmStartOpen(false)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function BreakModeOverlay() {
  const breakMode = useOptionalBreakMode()
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)

  if (!breakMode?.active) return null

  const { pending, error, endBreak } = breakMode

  return (
    <>
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
          <Button
            size="lg"
            disabled={pending}
            onClick={() => setConfirmEndOpen(true)}
          >
            <IconPlayerPlay data-icon="inline-start" />
            Resume Work
          </Button>
        </div>
      </div>

      <Dialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <DialogContent className="z-[80]">
          <DialogHeader>
            <DialogTitle>Resume work?</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop your break and restore the
              application?
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEndOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                endBreak()
                setConfirmEndOpen(false)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
