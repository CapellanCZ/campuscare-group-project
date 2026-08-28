"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { IconClock } from "@tabler/icons-react"

type IdleSessionWarningProps = {
  open: boolean
  secondsRemaining: number
  onContinueSession: () => void
}

export function IdleSessionWarning({
  open,
  secondsRemaining,
  onContinueSession,
}: IdleSessionWarningProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent size="default" className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-warning/15 text-warning">
            <IconClock className="size-8" aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>Session Inactivity Detected</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive for a while. Would you like to continue your
            session?
            <br />
            <span className="font-medium text-foreground">
              Session will be locked in{" "}
              <span className="font-semibold">{secondsRemaining}</span>{" "}
              {secondsRemaining === 1 ? "second" : "seconds"}.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onContinueSession}>
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
