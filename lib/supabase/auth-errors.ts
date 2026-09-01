import type { AuthError } from "@supabase/supabase-js"

/** Stale or missing refresh token in cookies — clear local session and continue logged out. */
export function isStaleRefreshTokenError(
  error: AuthError | null | undefined
): boolean {
  if (!error) return false
  return (
    error.code === "refresh_token_not_found" ||
    error.code === "invalid_refresh_token" ||
    error.message.includes("Refresh Token")
  )
}
