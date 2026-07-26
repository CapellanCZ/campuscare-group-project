import "server-only"

import { Resend } from "resend"

import { OTP_LENGTH } from "@/lib/auth/types"
import { createAdminClient } from "@/lib/supabase/admin"

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function buildOtpEmailHtml(token: string) {
  return `<h2>Your CampusCare sign-in code</h2>
<p>Enter this code in the app to finish signing in to CampusCare (NU Dasmariñas Health Services Office).</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${token}</p>
<p>This code expires soon. If you did not request it, you can ignore this email.</p>`
}

/**
 * Creates a Supabase email OTP without using Auth's mailer templates,
 * then delivers it through Resend.
 */
export async function sendLoginOtpEmail(email: string): Promise<void> {
  const admin = createAdminClient()

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile) {
    const notRegistered = new Error(
      "This email is not registered as clinic staff. Ask an admin to import your account first."
    )
    ;(notRegistered as Error & { status?: number }).status = 400
    throw notRegistered
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })

  if (error) {
    throw error
  }

  const token = data.properties.email_otp?.trim() ?? ""
  if (!token || token.length !== OTP_LENGTH) {
    throw new Error("Could not generate a verification code. Please try again.")
  }

  const resend = new Resend(requiredEnv("RESEND_API_KEY"))
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "nud-hso@campuscare.click"
  // Keep From display name ASCII-safe for SMTP providers.
  const fromName =
    process.env.RESEND_FROM_NAME?.trim().replace(/[^\x20-\x7E]/g, "") ||
    "NU Dasmarinas Health Services Office"

  const { error: sendError } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: email,
    subject: "Your CampusCare sign-in code",
    html: buildOtpEmailHtml(token),
    text: `Your CampusCare sign-in code is ${token}. It expires soon.`,
  })

  if (sendError) {
    throw new Error(
      typeof sendError === "object" && sendError && "message" in sendError
        ? String((sendError as { message?: string }).message)
        : "Could not send sign-in email."
    )
  }
}
