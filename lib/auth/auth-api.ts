import { sendOtpEmail, verifyOtpCode } from "@/app/auth/actions"
import { asErrorMessage } from "@/lib/auth/errors"
import {
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  type AuthResult,
} from "@/lib/auth/types"

export { OTP_LENGTH, RESEND_COOLDOWN_SECONDS }
export type { AuthResult }

function normalizeAuthResult(
  result: AuthResult | null | undefined,
  fallback: string
): AuthResult {
  if (!result || typeof result !== "object") {
    return { ok: false, error: fallback }
  }

  if ("ok" in result && result.ok === true) {
    return { ok: true }
  }

  return {
    ok: false,
    error: asErrorMessage(
      "error" in result ? result.error : undefined,
      fallback
    ),
  }
}

export async function sendOtp(email: string): Promise<AuthResult> {
  try {
    return normalizeAuthResult(
      await sendOtpEmail(email),
      "Could not send sign-in email."
    )
  } catch (error) {
    return {
      ok: false,
      error: asErrorMessage(error, "Could not send sign-in email."),
    }
  }
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<AuthResult> {
  try {
    return normalizeAuthResult(
      await verifyOtpCode(email, code),
      "Could not verify that code."
    )
  } catch (error) {
    return {
      ok: false,
      error: asErrorMessage(error, "Could not verify that code."),
    }
  }
}
