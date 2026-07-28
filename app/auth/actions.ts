"use server"

import { clearInvitePendingAfterSignIn } from "@/lib/auth/clear-invite-pending"
import { ensureStaffSession } from "@/lib/auth/ensure-staff-session"
import {
  isValidEmail,
  isValidOtpCode,
  normalizeEmail,
  sanitizeOtpInput,
} from "@/lib/auth/email"
import { asErrorMessage, mapAuthError } from "@/lib/auth/errors"
import { authCallbackUrl } from "@/lib/auth/site-url"
import type { AuthResult } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"

export async function sendOtpEmail(email: string): Promise<AuthResult> {
  try {
    const trimmed = normalizeEmail(email)

    if (!trimmed) {
      return { ok: false, error: "Enter your work email to continue." }
    }

    if (!isValidEmail(trimmed)) {
      return { ok: false, error: "Enter a valid email address." }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        // Staff accounts are provisioned by admins; do not auto-create on login.
        shouldCreateUser: false,
        emailRedirectTo: authCallbackUrl(),
      },
    })

    if (error) {
      return {
        ok: false,
        error: mapAuthError(error, "Could not send sign-in email."),
      }
    }

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
    const trimmedEmail = normalizeEmail(email)
    const trimmedToken = sanitizeOtpInput(token)

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      return { ok: false, error: "Session expired. Enter your email again." }
    }

    if (!isValidOtpCode(trimmedToken)) {
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
      await ensureStaffSession(user.id)
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
