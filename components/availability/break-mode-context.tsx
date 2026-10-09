"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react"

import {
  clearClinicBreak,
  clearStaffBreak,
  setClinicBreak,
  setStaffBreak,
} from "@/features/availability/actions/availability"
import { loadBreakBundleOnce } from "@/lib/availability/load-break-bundle-client"
import {
  DUTY_REFRESH_EVENT,
  emitDutyRefresh,
} from "@/components/staff-realtime-shell"
import {
  canUseClinicBreak,
  canUseStaffBreak,
  type BreakMode,
} from "@/lib/availability/break-mode"
import {
  getSessionBreakBundle,
  getSessionDutyStatus,
  patchSessionDutyStatus,
} from "@/lib/availability/session-duty-cache"
import type { BreakStatus, StaffDutyStatus } from "@/lib/availability/types"
import type { WebRole } from "@/lib/auth/types"

type BreakModeContextValue = {
  mode: BreakMode | null
  role: WebRole | null
  active: boolean
  resumesAt: string | null
  dutyStatus: StaffDutyStatus
  pending: boolean
  error: string | null
  startBreak: () => void
  endBreak: () => void
  refresh: () => void
}

const BreakModeContext = createContext<BreakModeContextValue | null>(null)

function defaultReopenIso(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString()
}

export function BreakModeProvider({
  mode,
  role,
  children,
}: {
  mode: BreakMode | null
  role: WebRole | null | undefined
  children: React.ReactNode
}) {
  const seeded = getSessionBreakBundle()
  const [clinicBreak, setClinicBreakState] = useState<BreakStatus | null>(
    () => seeded?.clinicBreak ?? null
  )
  const [staffBreak, setStaffBreakState] = useState<BreakStatus | null>(
    () => seeded?.staffBreak ?? null
  )
  const [dutyStatus, setDutyStatus] = useState<StaffDutyStatus>(
    getSessionDutyStatus
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canClinic = canUseClinicBreak(role, mode)
  const canStaff = canUseStaffBreak(role, mode)

  const active =
    mode === "clinic"
      ? Boolean(clinicBreak?.isOnBreak)
      : Boolean(staffBreak?.isOnBreak)
  const resumesAt =
    mode === "clinic" ? clinicBreak?.resumesAt ?? null : staffBreak?.resumesAt ?? null

  const refresh = useCallback(() => {
    if (!canClinic && !canStaff) return
    void loadBreakBundleOnce().then((bundle) => {
      setClinicBreakState(bundle.clinicBreak)
      setStaffBreakState(bundle.staffBreak)
      setDutyStatus(bundle.dutyStatus)
    })
  }, [canClinic, canStaff])

  useEffect(() => {
    if (!canClinic && !canStaff) return
    let cancelled = false
    void loadBreakBundleOnce().then((bundle) => {
      if (cancelled) return
      setClinicBreakState(bundle.clinicBreak)
      setStaffBreakState(bundle.staffBreak)
      setDutyStatus(bundle.dutyStatus)
    })
    return () => {
      cancelled = true
    }
  }, [canClinic, canStaff, role, mode])

  useEffect(() => {
    if (!canClinic && !canStaff) return
    const onDutyRefresh = () => {
      refresh()
    }
    window.addEventListener(DUTY_REFRESH_EVENT, onDutyRefresh)
    return () => {
      window.removeEventListener(DUTY_REFRESH_EVENT, onDutyRefresh)
    }
  }, [canClinic, canStaff, refresh])

  const startBreak = useCallback(() => {
    if (!mode) return
    setError(null)
    const iso = defaultReopenIso()
    const snapshot = {
      clinic: clinicBreak,
      staff: staffBreak,
      duty: dutyStatus,
    }
    const optimistic: BreakStatus = {
      isOnBreak: true,
      resumesAt: iso,
      setBy: null,
      updatedAt: new Date().toISOString(),
    }
    if (mode === "clinic") setClinicBreakState(optimistic)
    else {
      setStaffBreakState(optimistic)
      const nextDuty = {
        ...dutyStatus,
        status: "on_break" as const,
        updatedAt: optimistic.updatedAt,
      }
      patchSessionDutyStatus(nextDuty)
      setDutyStatus(nextDuty)
    }
    emitDutyRefresh()
    startTransition(async () => {
      const result =
        mode === "clinic" ? await setClinicBreak(iso) : await setStaffBreak(iso)
      if (!result.ok) {
        setClinicBreakState(snapshot.clinic)
        setStaffBreakState(snapshot.staff)
        setDutyStatus(snapshot.duty)
        setError(result.error)
        emitDutyRefresh()
        return
      }
      refresh()
      emitDutyRefresh()
    })
  }, [mode, refresh, clinicBreak, staffBreak, dutyStatus])

  const endBreak = useCallback(() => {
    if (!mode) return
    setError(null)
    const snapshot = {
      clinic: clinicBreak,
      staff: staffBreak,
      duty: dutyStatus,
    }
    const cleared: BreakStatus = {
      isOnBreak: false,
      resumesAt: null,
      setBy: null,
      updatedAt: new Date().toISOString(),
    }
    if (mode === "clinic") setClinicBreakState(cleared)
    else {
      setStaffBreakState(cleared)
      const nextDuty = {
        ...dutyStatus,
        status: "available" as const,
        updatedAt: cleared.updatedAt,
      }
      patchSessionDutyStatus(nextDuty)
      setDutyStatus(nextDuty)
    }
    emitDutyRefresh()
    startTransition(async () => {
      const result =
        mode === "clinic" ? await clearClinicBreak() : await clearStaffBreak()
      if (!result.ok) {
        setClinicBreakState(snapshot.clinic)
        setStaffBreakState(snapshot.staff)
        setDutyStatus(snapshot.duty)
        setError(result.error)
        emitDutyRefresh()
        return
      }
      refresh()
      emitDutyRefresh()
    })
  }, [mode, refresh, clinicBreak, staffBreak, dutyStatus])

  const value = useMemo<BreakModeContextValue>(
    () => ({
      mode,
      role: role ?? null,
      active: Boolean(mode) && active,
      resumesAt,
      dutyStatus,
      pending: isPending,
      error,
      startBreak,
      endBreak,
      refresh,
    }),
    [mode, role, active, resumesAt, dutyStatus, isPending, error, startBreak, endBreak, refresh]
  )

  return (
    <BreakModeContext.Provider value={value}>{children}</BreakModeContext.Provider>
  )
}

export function useBreakMode() {
  const ctx = useContext(BreakModeContext)
  if (!ctx) {
    throw new Error("useBreakMode must be used within BreakModeProvider")
  }
  return ctx
}

export function useOptionalBreakMode() {
  return useContext(BreakModeContext)
}
