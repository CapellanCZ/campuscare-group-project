"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type IdleSessionWarningProps = {
  open: boolean
  secondsRemaining: number
  onStaySignedIn: () => void
  onSignOut: () => void
}

export function IdleSessionWarning({
  open,
  secondsRemaining,
  onStaySignedIn,
  onSignOut,
}: IdleSessionWarningProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Escape / dismiss = continue session, not silent logout.
        if (!nextOpen) onStaySignedIn()
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll be signed out in{" "}
            <span className="font-medium text-foreground">
              {secondsRemaining}s
            </span>{" "}
            for inactivity. Continue your session to stay signed in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
          <AlertDialogAction onClick={onStaySignedIn}>
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
