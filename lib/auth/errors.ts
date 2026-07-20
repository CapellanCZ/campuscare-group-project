type AuthLikeError = {
  message?: string
  code?: string
  status?: number
} | null

export function mapAuthError(error: AuthLikeError, fallback: string): string {
  if (!error?.message) return fallback

  const message = error.message.toLowerCase()

  if (message.includes("rate limit") || error.status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }

  if (
    message.includes("token") ||
    message.includes("otp") ||
    message.includes("expired") ||
    message.includes("invalid")
  ) {
    return "That code is invalid or expired. Request a new one."
  }

  if (message.includes("signups not allowed") || message.includes("signup")) {
    return "Staff accounts are invite-only. Contact a clinic admin."
  }

  return error.message || fallback
}
