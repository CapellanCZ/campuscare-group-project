"use server"

import { asErrorMessage, mapAuthError } from "@/lib/auth/errors"
import { sendLoginOtpEmail } from "@/lib/auth/send-login-otp"
import type { AuthResult } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"

export async function sendOtpEmail(email: string): Promise<AuthResult> {
  try {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      return { ok: false, error: "Enter your work email to continue." }
    }

    // Deliver OTP via Resend from the Next.js server (edge function not required).
    await sendLoginOtpEmail(trimmed)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: mapAuthError(
        error as { message?: string; status?: number; name?: string },
        asErrorMessage(error, "Could not send sign-in email.")
      ),
    }
  }
}

export async function verifyOtpCode(
  email: string,
  token: string
): Promise<AuthResult> {
  try {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedToken = token.trim()

    if (!trimmedEmail) {
      return { ok: false, error: "Session expired. Enter your email again." }
    }

    if (trimmedToken.length !== 6) {
      return { ok: false, error: "Enter the full 6-digit verification code." }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: "email",
    })

    if (error) {
      return {
        ok: false,
        error: mapAuthError(error, "Could not verify that code."),
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: asErrorMessage(error, "Could not verify that code."),
    }
  }
}

export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { ok: false, error: mapAuthError(error, "Could not sign out.") }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: asErrorMessage(error, "Could not sign out."),
    }
  }
}
