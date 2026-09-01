"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react"
import { IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react"

import { useOptionalBreakMode } from "@/components/availability/break-mode-context"
import { DUTY_REFRESH_EVENT } from "@/components/staff-realtime-shell"
import { useConfirm } from "@/components/feedback/confirm-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  endDutyAction,
  loadMyBreakBundle,
  startDutyAction,
} from "@/features/availability/actions/availability"
import { dutyStatusLabel } from "@/lib/availability/types"
import type { DutyStatusValue, StaffDutyStatus } from "@/lib/availability/types"
import { dutyToasts } from "@/lib/feedback/toast-messages"
import type { WebRole } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

type DutyContextValue = {
  dutyStatus: StaffDutyStatus
  role: WebRole | null
  pending: boolean
  refresh: () => void
}

const DutyContext = createContext<DutyContextValue | null>(null)

const DEFAULT_DUTY: StaffDutyStatus = {
  status: "not_available",
  dutyStartedAt: null,
  dutyEndedAt: null,
  updatedAt: null,
}

export function DutyStatusProvider({
  role,
  children,
}: {
  role: WebRole | null | undefined
  children: ReactNode
}) {
  const clinical =
    role === "nurse" || role === "physician" || role === "dentist"
  const [dutyStatus, setDutyStatus] = useState<StaffDutyStatus>(DEFAULT_DUTY)
  const [isPending, startTransition] = useTransition()

  const refresh = useCallback(() => {
    if (!clinical) return
    void loadMyBreakBundle().then((bundle) => {
      setDutyStatus(bundle.dutyStatus)
    })
  }, [clinical])

  useEffect(() => {
    if (!clinical) return
    let cancelled = false
    void loadMyBreakBundle().then((bundle) => {
      if (cancelled) return
      setDutyStatus(bundle.dutyStatus)
    })
    return () => {
      cancelled = true
    }
  }, [clinical, role])

  useEffect(() => {
    if (!clinical) return
    const onDutyRefresh = () => {
      refresh()
    }
    window.addEventListener(DUTY_REFRESH_EVENT, onDutyRefresh)
    return () => {
      window.removeEventListener(DUTY_REFRESH_EVENT, onDutyRefresh)
    }
  }, [clinical, refresh])

  const value = useMemo(
    () => ({
      dutyStatus,
      role: role ?? null,
      pending: isPending,
      refresh,
    }),
    [dutyStatus, role, isPending, refresh]
  )

  if (!clinical) {
    return <>{children}</>
  }

  return <DutyContext.Provider value={value}>{children}</DutyContext.Provider>
}

export function useDutyStatus() {
  const ctx = useContext(DutyContext)
  if (!ctx) {
    throw new Error("useDutyStatus must be used within DutyStatusProvider")
  }
  return ctx
}

export function useOptionalDutyStatus() {
  return useContext(DutyContext)
}

function dutyBadgeVariant(
  status: DutyStatusValue
): "default" | "secondary" | "outline" {
  if (status === "available") return "default"
  if (status === "on_break") return "secondary"
  return "outline"
}

export function DutyStatusBadge({ className }: { className?: string }) {
  const ctx = useOptionalDutyStatus()
  if (!ctx) return null

  return (
    <Badge variant={dutyBadgeVariant(ctx.dutyStatus.status)} className={className}>
      {dutyStatusLabel(ctx.dutyStatus.status)}
    </Badge>
  )
}

export function DutyStatusControl({ className }: { className?: string }) {
  const ctx = useOptionalDutyStatus()
  const breakMode = useOptionalBreakMode()
  const { confirmPreset } = useConfirm()

  if (!ctx) return null

  const { dutyStatus, pending, refresh } = ctx
  const onBreak = dutyStatus.status === "on_break" || Boolean(breakMode?.active)

  if (onBreak) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <DutyStatusBadge />
      </div>
    )
  }

  const handleStartDuty = () => {
    void confirmPreset("startDuty", {
      onConfirm: async () => {
        const result = await startDutyAction()
        if (!result.ok) {
          dutyToasts.failed(result.error)
          throw new Error(result.error)
        }
        dutyToasts.started()
        refresh()
      },
    })
  }

  const handleEndDuty = () => {
    void confirmPreset("endDuty", {
      onConfirm: async () => {
        const result = await endDutyAction()
        if (!result.ok) {
          dutyToasts.failed(result.error)
          throw new Error(result.error)
        }
        dutyToasts.ended()
        refresh()
      },
    })
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <DutyStatusBadge />
      {dutyStatus.status === "not_available" ? (
        <Button size="sm" disabled={pending} onClick={handleStartDuty}>
          <IconPlayerPlay data-icon="inline-start" />
          Start Duty
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={handleEndDuty}
        >
          <IconPlayerStop data-icon="inline-start" />
          End Duty
        </Button>
      )}
    </div>
  )
}
