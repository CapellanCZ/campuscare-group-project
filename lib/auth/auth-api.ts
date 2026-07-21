import {
  getPostLoginPath,
  sendOtpEmail,
  verifyOtpCode,
} from "@/app/auth/actions"
import {
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  type AuthResult,
  type PostLoginPathResult,
} from "@/lib/auth/types"

export { OTP_LENGTH, RESEND_COOLDOWN_SECONDS }
export type { AuthResult }
export type { PostLoginPathResult }

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

export async function resolvePostLoginPath(): Promise<PostLoginPathResult> {
  return getPostLoginPath()
}
