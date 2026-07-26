"use client"

import { createContext, useContext } from "react"

import type { StaffAccess } from "@/lib/auth/types"

const StaffAccessContext = createContext<StaffAccess | null>(null)

export function StaffAccessProvider({
  access,
  children,
}: {
  access: StaffAccess
  children: React.ReactNode
}) {
  return (
    <StaffAccessContext.Provider value={access}>
      {children}
    </StaffAccessContext.Provider>
  )
}

export function useStaffAccess() {
  const value = useContext(StaffAccessContext)
  if (!value) {
    throw new Error("useStaffAccess must be used within StaffAccessProvider")
  }
  return value
}

export function useOptionalStaffAccess() {
  return useContext(StaffAccessContext)
}
