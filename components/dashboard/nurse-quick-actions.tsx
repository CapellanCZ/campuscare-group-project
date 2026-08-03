"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconPlayerPlay,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react"

import { ModuleSnapshot } from "@/components/dashboard/module-snapshot"
import { Button } from "@/components/ui/button"
import { can } from "@/lib/auth/permissions"
import type { StaffAccess } from "@/lib/auth/types"
import { actionCallNext } from "@/lib/health/queue-server-actions"
import { canRegisterWalkIn } from "@/lib/health/roles"

export function NurseQuickActions({
  access,
  onRegisterWalkIn,
}: {
  access: StaffAccess
  onRegisterWalkIn: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const canCall = can(access.designation, "queue.call_next")
  const showWalkIn = canRegisterWalkIn(access.designation)

  return (
    <ModuleSnapshot title="Quick actions" description="Desk moves.">
      <div className="flex flex-col gap-2">
        {showWalkIn ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={onRegisterWalkIn}
          >
            <IconUserPlus className="size-4" aria-hidden />
            Register walk-in
          </Button>
        ) : null}
        {canCall ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await actionCallNext("nurse")
                if (!result.ok) {
                  toast.error(result.error ?? "Call next failed")
                  return
                }
                toast.success(result.message ?? "Called next patient")
                router.refresh()
              })
            }
          >
            <IconPlayerPlay className="size-4" aria-hidden />
            Call next
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/nurse/patient-records" />}
          nativeButton={false}
        >
          <IconUsers className="size-4" aria-hidden />
          Patient records
        </Button>
      </div>
    </ModuleSnapshot>
  )
}
