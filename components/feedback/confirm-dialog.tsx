"use client"

import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconTrash,
} from "@tabler/icons-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import type { ConfirmOptions } from "@/lib/feedback/confirm-context"

function ConfirmIcon({ variant }: { variant: ConfirmOptions["variant"] }) {
  const className = "size-8"
  if (variant === "destructive") {
    return <IconTrash className={className} aria-hidden />
  }
  if (variant === "warning") {
    return <IconAlertTriangle className={className} aria-hidden />
  }
  return <IconCircleCheck className={className} aria-hidden />
}

export function ConfirmDialog({
  open,
  options,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean
  options: ConfirmOptions | null
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!options) return null

  const hideCancel = options.hideCancel ?? false

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending && !hideCancel) onCancel()
      }}
    >
      <AlertDialogContent size="default" className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              options.variant === "destructive" &&
                "bg-destructive/10 text-destructive",
              options.variant === "warning" && "bg-warning/15 text-warning",
              options.variant === "default" && "bg-primary/10 text-primary"
            )}
          >
            {options.icon ?? <ConfirmIcon variant={options.variant} />}
          </AlertDialogMedia>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          <AlertDialogDescription>{options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!hideCancel ? (
            <AlertDialogCancel disabled={pending} onClick={onCancel}>
              {options.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
          ) : null}
          <AlertDialogAction
            variant={options.variant === "destructive" ? "destructive" : "default"}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {pending
              ? options.pendingLabel ?? "Processing…"
              : options.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
