"use client"

import { useTransition } from "react"
import { IconUserPlus } from "@tabler/icons-react"

import { syncPatientAuthAccountsAction } from "@/features/patients/actions"
import { Button } from "@/components/ui/button"
import { appToast } from "@/lib/feedback/app-toast"

type SyncPatientAccountsButtonProps = {
  toolbar?: boolean
  onSynced?: () => void
}

/** Provisions Auth + public.users for patients rows with null auth_user_id. */
export function SyncPatientAccountsButton({
  toolbar = false,
  onSynced,
}: SyncPatientAccountsButtonProps) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={toolbar ? "shrink-0" : undefined}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await syncPatientAuthAccountsAction()
          if (!result.ok) {
            appToast.error({
              title: "Account sync failed",
              description: result.error,
            })
            return
          }
          appToast.success({
            title: "Patient accounts synced",
            description: result.message,
          })
          if (result.warning) {
            appToast.warning({
              title: "Some accounts need attention",
              description: result.warning,
            })
          }
          onSynced?.()
        })
      }}
    >
      <IconUserPlus data-icon="inline-start" className="size-4" />
      {pending ? "Syncing accounts…" : "Sync accounts"}
    </Button>
  )
}
