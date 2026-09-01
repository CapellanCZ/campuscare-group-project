"use server"

import { clearInvitePendingAfterSignIn } from "@/lib/auth/clear-invite-pending"
import { asErrorMessage, mapAuthError } from "@/lib/auth/errors"
import { sendLoginOtpEmail } from "@/lib/auth/send-login-otp"
import type { AuthResult } from "@/lib/auth/types"
import { isStaleRefreshTokenError } from "@/lib/supabase/auth-errors"
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
    const authError = error as {
      message?: string
      status?: number
      name?: string
      code?: string
    }
    if (authError.code === "account_not_activated") {
      return {
        ok: false,
        error:
          authError.message ||
          "Activate your account using the invite email link before signing in with a one-time code.",
        code: "account_not_activated",
      }
    }
    return {
      ok: false,
      error: mapAuthError(
        authError,
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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await clearInvitePendingAfterSignIn(user.id)
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

    if (error && !isStaleRefreshTokenError(error)) {
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

/**
 * Password sign-in for the public queue display kiosk account.
 * Only users with primary_role = queue_display may succeed.
 */
export async function signInDisplayAccount(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password

    if (!trimmedEmail) {
      return { ok: false, error: "Enter the display account email." }
    }
    if (!trimmedPassword) {
      return { ok: false, error: "Enter the display account password." }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    })

    if (error) {
      return {
        ok: false,
        error: mapAuthError(error, "Invalid email or password."),
      }
    }

    const userId = data.user?.id
    if (!userId) {
      return { ok: false, error: "Could not establish a display session." }
    }

    const { data: profile } = await supabase
      .from("users")
      .select("primary_role, is_active")
      .eq("id", userId)
      .maybeSingle()

    if (!profile?.is_active || profile.primary_role !== "queue_display") {
      await supabase.auth.signOut()
      return {
        ok: false,
        error: "This account is not a display login.",
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: asErrorMessage(error, "Could not sign in to the display."),
    }
  }
}
