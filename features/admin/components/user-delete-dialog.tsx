"use client"

import { IconTrash } from "@tabler/icons-react"

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

type UserDeleteDialogProps = {
  open: boolean
  /** Number of accounts selected for deletion. */
  count: number
  /** Optional single-user label when count === 1. */
  userName?: string
  userEmail?: string
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** ReUI c-alert-dialog-5 — destructive confirm for staff account deletion. */
export function UserDeleteDialog({
  open,
  count,
  userName = "",
  userEmail = "",
  pending = false,
  onOpenChange,
  onConfirm,
}: UserDeleteDialogProps) {
  const plural = count !== 1
  const subject = plural
    ? `${count} selected accounts`
    : userName || "this account"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <IconTrash aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes{" "}
            <span className="font-medium text-foreground">{subject}</span>
            {!plural && userEmail ? (
              <>
                {" "}
                (<span className="font-medium text-foreground">{userEmail}</span>)
              </>
            ) : null}{" "}
            and revokes clinic access. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" disabled={pending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={pending || count < 1}
            onClick={onConfirm}
          >
            {pending ? "Deleting…" : plural ? `Delete ${count}` : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
