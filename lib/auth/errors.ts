type AuthLikeError = {
  message?: string
  code?: string
  status?: number
  name?: string
} | null

function isUsableMessage(message: unknown): message is string {
  if (typeof message !== "string") return false
  const trimmed = message.trim()
  if (!trimmed) return false
  // Supabase sometimes surfaces AuthRetryableFetchError with message "{}"
  if (trimmed === "{}" || trimmed === "null" || trimmed === "[object Object]") {
    return false
  }
  return true
}

export function asErrorMessage(value: unknown, fallback: string): string {
  if (isUsableMessage(value)) {
    return value.trim()
  }

  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message
    if (isUsableMessage(message)) {
      return message.trim()
    }
  }

  return fallback
}

export function mapAuthError(error: AuthLikeError, fallback: string): string {
  const status = error?.status
  const name = error?.name?.toLowerCase() ?? ""
  const rawMessage = isUsableMessage(error?.message)
    ? error.message.trim()
    : ""
  const message = rawMessage.toLowerCase()

  if (status === 429 || message.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again."
  }

  if (
    status === 500 ||
    name.includes("retryable") ||
    message.includes("sending magic link") ||
    message.includes("error sending") ||
    message.includes("smtp") ||
    (message.includes("email") && message.includes("send"))
  ) {
    return "We couldn't send the sign-in email. Please try again in a moment."
  }

  if (
    message.includes("jwt") ||
    message.includes("kid") ||
    message.includes("unrecognized") ||
    message.includes("unable to parse or verify")
  ) {
    return "Sign-in is temporarily unavailable. Please try again in a moment."
  }

  if (
    message.includes("token") ||
    message.includes("otp") ||
    ((message.includes("expired") || message.includes("invalid")) &&
      !message.includes("credential"))
  ) {
    return "That code is invalid or expired. Request a new one."
  }

  if (message.includes("signups not allowed") || message.includes("signup")) {
    return "Staff accounts are invite-only. Contact a clinic admin."
  }

  return rawMessage || fallback
}
