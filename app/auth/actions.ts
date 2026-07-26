"use server"

import { asErrorMessage, mapAuthError } from "@/lib/auth/errors"
import type { AuthResult } from "@/lib/auth/types"
import { createClient } from "@/lib/supabase/server"

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!
}

function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
}

type WebSignInResponse = {
  ok?: boolean
  error?: string
}

export async function sendOtpEmail(email: string): Promise<AuthResult> {
  try {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      return { ok: false, error: "Enter your work email to continue." }
    }

    // Bypass broken Supabase SMTP: generate link/OTP via admin API inside the
    // edge function, then deliver with Resend HTTP (same path as staff OTP).
    // apikey only — do not send legacy anon JWT as Bearer (ES256 signing keys
    // reject HS256 API keys with "unrecognized JWT kid <nil>").
    const response = await fetch(
      `${supabaseUrl()}/functions/v1/web-sign-in-otp`,
      {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmed,
          redirectTo: `${siteUrl()}/auth/callback`,
        }),
      }
    )

    const payload = (await response.json().catch(() => null)) as
      | WebSignInResponse
      | null

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        error: asErrorMessage(
          payload?.error,
          "Could not send sign-in email."
        ),
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: asErrorMessage(error, "Could not send sign-in email."),
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
