type AuthLikeError = {
  message?: string
  code?: string
  status?: number
  name?: string
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
  const code = error?.code?.toLowerCase() ?? ""
  const rawMessage = usableMessage(error?.message)
  const message = (rawMessage ?? "").toLowerCase()

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

  // Supabase Auth email delivery failures (custom SMTP misconfigured/auth failed)
  if (
    status === 500 ||
    code.includes("unexpected_failure") ||
    message.includes("535") ||
    message.includes("authentication failed") ||
    message.includes("smtp") ||
    message.includes("error sending") ||
    message.includes("unable to send") ||
    message.includes("resend")
  ) {
    return "Could not send the email right now. Ask an admin to check the clinic email (SMTP) settings."
  }

  if (message.includes("missing required environment variable")) {
    return "Sign-in email is not configured yet. Ask an admin to finish email setup."
  }

  if (message.includes("rate limit") || status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }

  if (
    message.includes("signups not allowed") ||
    message.includes("signup not allowed") ||
    message.includes("user not found") ||
    message.includes("unable to validate email") ||
    message.includes("email not found")
  ) {
    return "This email is not registered as clinic staff. Ask an admin to import your account first."
  }

  // Verify-step failures only (avoid matching generic "otp" send failures)
  if (
    message.includes("token has expired") ||
    message.includes("token is invalid") ||
    message.includes("otp has expired") ||
    message.includes("invalid otp") ||
    message.includes("invalid token") ||
    (message.includes("expired") && message.includes("token"))
  ) {
    return "That code is invalid or expired. Request a new one."
  }

  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout")
  ) {
    return "Could not reach the sign-in service. Check your connection and try again."
  }

  if (!rawMessage) return fallback

  return rawMessage
}
