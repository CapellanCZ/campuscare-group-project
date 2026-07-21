import type { WebRole } from "@/lib/auth/types"

/** Development-only auth skip for UI testing. Never enable in production. */
export function isDevAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development"
}

export const DEV_BYPASS_ROLE: WebRole = "admin"
