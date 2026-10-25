import { OTP_LENGTH } from "@/lib/auth/types"

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value)
  if (!email || email.length > 254) return false

  // Practical RFC 5321-inspired check: local@domain with a real TLD segment.
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    email
  )
}

/** Domain appended when display login gets a username without `@`. */
export function getDisplayLoginEmailDomain(): string {
  const raw =
    process.env.NEXT_PUBLIC_DISPLAY_LOGIN_EMAIL_DOMAIN?.trim() ||
    process.env.DISPLAY_LOGIN_EMAIL_DOMAIN?.trim() ||
    "gmail.com"
  return raw.replace(/^@+/, "").toLowerCase()
}

/**
 * Display kiosk identity: full email, or username → `username@domain`.
 * Example: `NUHSODisplay` → `nuhsodisplay@gmail.com` (domain configurable).
 */
export function resolveDisplayLoginEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null

  if (trimmed.includes("@")) {
    return isValidEmail(trimmed) ? normalizeEmail(trimmed) : null
  }

  // Username-only: letters, numbers, . _ - (Supabase local-part friendly)
  if (!/^[a-z0-9._+-]{2,64}$/i.test(trimmed)) return null

  const email = `${trimmed}@${getDisplayLoginEmailDomain()}`
  return isValidEmail(email) ? email : null
}

export function sanitizeOtpInput(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH)
}

export function isValidOtpCode(value: string) {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value.trim())
}

export function maskEmail(email: string) {
  const normalized = normalizeEmail(email)
  const [local, domain] = normalized.split("@")
  if (!local || !domain) return normalized

  if (local.length <= 2) {
    return `${local[0] ?? ""}*@${domain}`
  }

  return `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 4))}@${domain}`
}
