"use client"

import { ConfirmProvider } from "@/components/feedback/confirm-provider"
import { IdleSessionProvider } from "@/components/auth/idle-session-provider"
import { StaffSessionGuard } from "@/components/auth/staff-session-guard"

export function StaffSessionShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConfirmProvider>
      <IdleSessionProvider>
        <StaffSessionGuard />
        {children}
      </IdleSessionProvider>
    </ConfirmProvider>
  )
}
