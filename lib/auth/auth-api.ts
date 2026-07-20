import {
  sendOtpEmail,
  verifyOtpCode,
} from "@/app/auth/actions"
import {
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  type AuthResult,
} from "@/lib/auth/types"

export { OTP_LENGTH, RESEND_COOLDOWN_SECONDS }
export type { AuthResult }

export async function sendMagicLink(email: string): Promise<AuthResult> {
  return sendOtpEmail(email)
}

export async function sendOtp(email: string): Promise<AuthResult> {
  return sendOtpEmail(email)
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<AuthResult> {
  return verifyOtpCode(email, code)
}
