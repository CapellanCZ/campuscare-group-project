"use client"

import { ConfirmProvider } from "@/components/feedback/confirm-provider"
import { IdleSessionProvider } from "@/components/auth/idle-session-provider"

export function StaffSessionShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConfirmProvider>
      <IdleSessionProvider>{children}</IdleSessionProvider>
    </ConfirmProvider>
  )
}
