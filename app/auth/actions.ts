"use server"

import { mapAuthError } from "@/lib/auth/errors"
import { getStaffAccess } from "@/lib/auth/access"
import {
  isValidEmail,
  isValidOtpCode,
  normalizeEmail,
  sanitizeOtpInput,
} from "@/lib/auth/email"
import {
  dashboardPathForRole,
  roleRequiresClinicMembership,
} from "@/lib/auth/redirects"
import { sendLoginOtpEmail } from "@/lib/auth/send-login-otp"
import type { AuthResult, PostLoginPathResult } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"

export async function sendOtpEmail(email: string): Promise<AuthResult> {
  const trimmed = normalizeEmail(email)

  if (!trimmed) {
    return { ok: false, error: "Enter your work email to continue." }
  }

  if (!isValidEmail(trimmed)) {
    return { ok: false, error: "Enter a valid email address." }
  }

  try {
    await sendLoginOtpEmail(trimmed)
    return { ok: true }
  } catch (error) {
    console.error("[auth.sendOtpEmail]", {
      email: trimmed,
      error,
    })
    return {
      ok: false,
      error: mapAuthError(
        error as { message?: string; status?: number; code?: string },
        "Could not send verification code."
      ),
    }
  }
}

export async function verifyOtpCode(
  email: string,
  token: string
): Promise<AuthResult> {
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

  return { ok: true }
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { ok: false, error: mapAuthError(error, "Could not sign out.") }
  }

  return { ok: true }
}

export async function getPostLoginPath(): Promise<PostLoginPathResult> {
  const access = await getStaffAccess()

  if (!access) {
    return { ok: false, error: "Could not resolve your staff access." }
  }

  if (
    roleRequiresClinicMembership(access.primaryRole) &&
    !access.hasClinicMembership
  ) {
    return { ok: true, path: "/auth/pending" }
  }

  return { ok: true, path: dashboardPathForRole(access.primaryRole) }
}
