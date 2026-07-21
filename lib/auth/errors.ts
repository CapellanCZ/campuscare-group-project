type AuthLikeError = {
  message?: string
  code?: string
  status?: number
} | null

function usableMessage(message: string | undefined): string | null {
  if (!message) return null

  const trimmed = message.trim()
  if (!trimmed) return null

  // auth-js stringifies fetch Response bodies as "{}" on 5xx timeouts
  if (trimmed === "{}" || trimmed === "[object Object]") return null

  return trimmed
}

export function mapAuthError(error: AuthLikeError, fallback: string): string {
  const status = error?.status

  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 520 ||
    status === 521 ||
    status === 522 ||
    status === 523 ||
    status === 524
  ) {
    return "Sign-in is temporarily unavailable. Please try again in a moment."
  }

  const rawMessage = usableMessage(error?.message)
  if (!rawMessage) return fallback

  const message = rawMessage.toLowerCase()

  if (message.includes("rate limit") || status === 429) {
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

  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout")
  ) {
    return "Could not reach the sign-in service. Check your connection and try again."
  }

  return rawMessage
}
