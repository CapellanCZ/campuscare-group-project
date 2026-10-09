"use client"

import type { BreakStatus, StaffDutyStatus } from "@/lib/availability/types"
import type { WebRole } from "@/lib/auth/types"

export type SessionBreakBundle = {
  clinicBreak: BreakStatus | null
  staffBreak: BreakStatus | null
  dutyStatus: StaffDutyStatus
  role: WebRole | null
}

const DEFAULT_DUTY: StaffDutyStatus = {
  status: "not_available",
  dutyStartedAt: null,
  dutyEndedAt: null,
  updatedAt: null,
}

/** Survives AppShell remounts during soft navigations. */
let cached: SessionBreakBundle | null = null

export function getSessionBreakBundle(): SessionBreakBundle | null {
  return cached
}

export function getSessionDutyStatus(): StaffDutyStatus {
  return cached?.dutyStatus ?? DEFAULT_DUTY
}

export function saveSessionBreakBundle(bundle: SessionBreakBundle) {
  cached = bundle
}

export function patchSessionDutyStatus(next: StaffDutyStatus) {
  if (!cached) {
    cached = {
      clinicBreak: null,
      staffBreak: null,
      dutyStatus: next,
      role: null,
    }
    return
  }
  cached = { ...cached, dutyStatus: next }
}
