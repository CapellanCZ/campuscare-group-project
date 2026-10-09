"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react"

import { useOptionalBreakMode } from "@/components/availability/break-mode-context"
import {
  DUTY_REFRESH_EVENT,
  emitDutyRefresh,
} from "@/components/staff-realtime-shell"
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
  /** Local-first status flip before the server round-trip completes. */
  applyOptimistic: (next: StaffDutyStatus) => void
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

  const refresh = useCallback(() => {
    if (!clinical) return
    void loadMyBreakBundle().then((bundle) => {
      setDutyStatus(bundle.dutyStatus)
    })
  }, [clinical])

  const applyOptimistic = useCallback((next: StaffDutyStatus) => {
    setDutyStatus(next)
  }, [])

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
      pending: false,
      refresh,
      applyOptimistic,
    }),
    [dutyStatus, role, refresh, applyOptimistic]
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

export function DutyStatusControl({
  className,
  compact = false,
}: {
  className?: string
  /** Hide status badge on narrow headers; keep Start/End Duty actionable. */
  compact?: boolean
}) {
  const ctx = useOptionalDutyStatus()
  const breakMode = useOptionalBreakMode()
  const { confirmPreset } = useConfirm()

  if (!ctx) return null

  const { dutyStatus, pending, refresh, applyOptimistic } = ctx
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
        const snapshot = dutyStatus
        const now = new Date().toISOString()
        applyOptimistic({
          status: "available",
          dutyStartedAt: now,
          dutyEndedAt: null,
          updatedAt: now,
        })
        emitDutyRefresh()
        const result = await startDutyAction()
        if (!result.ok) {
          applyOptimistic(snapshot)
          dutyToasts.failed(result.error)
          refresh()
          emitDutyRefresh()
          throw new Error(result.error)
        }
        dutyToasts.started()
        refresh()
        emitDutyRefresh()
      },
    })
  }

  const handleEndDuty = () => {
    void confirmPreset("endDuty", {
      onConfirm: async () => {
        const snapshot = dutyStatus
        const now = new Date().toISOString()
        applyOptimistic({
          status: "not_available",
          dutyStartedAt: snapshot.dutyStartedAt,
          dutyEndedAt: now,
          updatedAt: now,
        })
        emitDutyRefresh()
        const result = await endDutyAction()
        if (!result.ok) {
          applyOptimistic(snapshot)
          dutyToasts.failed(result.error)
          refresh()
          emitDutyRefresh()
          throw new Error(result.error)
        }
        dutyToasts.ended()
        refresh()
        emitDutyRefresh()
      },
    })
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 sm:gap-2", className)}>
      <DutyStatusBadge className={cn(compact && "hidden sm:inline-flex")} />
      {dutyStatus.status === "not_available" ? (
        <Button size="sm" disabled={pending} onClick={handleStartDuty}>
          <IconPlayerPlay data-icon="inline-start" />
          {compact ? (
            <>
              <span className="sm:hidden">Duty</span>
              <span className="hidden sm:inline">Start Duty</span>
            </>
          ) : (
            "Start Duty"
          )}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={handleEndDuty}
        >
          <IconPlayerStop data-icon="inline-start" />
          {compact ? (
            <>
              <span className="sm:hidden">End</span>
              <span className="hidden sm:inline">End Duty</span>
            </>
          ) : (
            "End Duty"
          )}
        </Button>
      )}
    </div>
  )
}
