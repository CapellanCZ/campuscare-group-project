"use server"

import { mapAuthError } from "@/lib/auth/errors"
import type { AuthResult } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

export async function sendOtpEmail(email: string): Promise<AuthResult> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) {
    return { ok: false, error: "Enter your work email to continue." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  })

  if (error) {
    return {
      ok: false,
      error: mapAuthError(error, "Could not send sign-in email."),
    }
  }

  return { ok: true }
}

export async function verifyOtpCode(
  email: string,
  token: string
): Promise<AuthResult> {
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
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { ok: false, error: mapAuthError(error, "Could not sign out.") }
  }

  return { ok: true }
}
