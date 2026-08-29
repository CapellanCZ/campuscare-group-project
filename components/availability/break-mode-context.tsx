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
  loadMyBreakBundle,
  setClinicBreak,
  setStaffBreak,
} from "@/features/availability/actions/availability"
import type { BreakStatus, StaffDutyStatus } from "@/lib/availability/types"
import type { WebRole } from "@/lib/auth/types"

type BreakMode = "clinic" | "staff"

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
  const [clinicBreak, setClinicBreakState] = useState<BreakStatus | null>(null)
  const [staffBreak, setStaffBreakState] = useState<BreakStatus | null>(null)
  const [dutyStatus, setDutyStatus] = useState<StaffDutyStatus>({
    status: "not_available",
    dutyStartedAt: null,
    dutyEndedAt: null,
    updatedAt: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canClinic = mode === "clinic" && (role === "nurse" || role === "admin")
  const canStaff =
    mode === "staff" &&
    (role === "physician" || role === "dentist" || role === "nurse")

  const active =
    mode === "clinic"
      ? Boolean(clinicBreak?.isOnBreak)
      : Boolean(staffBreak?.isOnBreak)
  const resumesAt =
    mode === "clinic" ? clinicBreak?.resumesAt ?? null : staffBreak?.resumesAt ?? null

  const refresh = useCallback(() => {
    if (!canClinic && !canStaff) return
    void loadMyBreakBundle().then((bundle) => {
      setClinicBreakState(bundle.clinicBreak)
      setStaffBreakState(bundle.staffBreak)
      setDutyStatus(bundle.dutyStatus)
    })
  }, [canClinic, canStaff])

  useEffect(() => {
    if (!canClinic && !canStaff) return
    let cancelled = false
    void loadMyBreakBundle().then((bundle) => {
      if (cancelled) return
      setClinicBreakState(bundle.clinicBreak)
      setStaffBreakState(bundle.staffBreak)
      setDutyStatus(bundle.dutyStatus)
    })
    return () => {
      cancelled = true
    }
  }, [canClinic, canStaff, role, mode])

  const startBreak = useCallback(() => {
    if (!mode) return
    setError(null)
    const iso = defaultReopenIso()
    startTransition(async () => {
      const result =
        mode === "clinic" ? await setClinicBreak(iso) : await setStaffBreak(iso)
      if (!result.ok) {
        setError(result.error)
        return
      }
      refresh()
    })
  }, [mode, refresh])

  const endBreak = useCallback(() => {
    if (!mode) return
    setError(null)
    startTransition(async () => {
      const result =
        mode === "clinic" ? await clearClinicBreak() : await clearStaffBreak()
      if (!result.ok) {
        setError(result.error)
        return
      }
      refresh()
    })
  }, [mode, refresh])

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
