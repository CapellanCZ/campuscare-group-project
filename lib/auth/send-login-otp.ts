import "server-only"

import { OTP_LENGTH } from "@/lib/auth/types"
import { sendResendEmail } from "@/lib/auth/resend-client"
import { createAdminClient } from "@/lib/supabase/admin"

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

  const { data: userRow, error: userError } = await admin
    .from("users")
    .select("id, is_active, primary_role")
    .eq("email", email)
    .maybeSingle()

  if (userError) {
    throw userError
  }

  if (!userRow) {
    const notRegistered = new Error(
      "This email is not registered as clinic staff. Ask an admin to import your account first."
    )
    ;(notRegistered as Error & { status?: number }).status = 400
    throw notRegistered
  }

  if (userRow.is_active === false) {
    const inactive = new Error(
      "This account is inactive. Ask an admin to restore access."
    )
    ;(inactive as Error & { status?: number }).status = 403
    throw inactive
  }

  const role = String(userRow.primary_role ?? "").toLowerCase()
  if (role === "admin") {
    const { data: adminRow } = await admin
      .from("admin_accounts")
      .select("user_id")
      .eq("user_id", userRow.id)
      .eq("is_active", true)
      .maybeSingle()

    if (!adminRow) {
      const pending = new Error(
        "This admin account is not activated yet. Ask another admin to finish setup."
      )
      ;(pending as Error & { status?: number }).status = 403
      throw pending
    }
  } else {
    const { data: membership } = await admin
      .from("clinic_members")
      .select("user_id")
      .eq("user_id", userRow.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      const pending = new Error(
        "This account is not assigned to the clinic yet. Ask an admin to finish setup."
      )
      ;(pending as Error & { status?: number }).status = 403
      throw pending
    }
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

  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  if (!resendApiKey) {
    // Local/dev without Resend: print the OTP so sign-in still works.
    if (process.env.NODE_ENV === "development") {
      console.info(
        `\n[CampusCare dev] OTP for ${email}: ${token}\n` +
          `Add RESEND_API_KEY to .env.local to send real emails.\n`
      )
      return
    }
    throw new Error(
      "Missing required environment variable: RESEND_API_KEY. Add it to .env.local from https://resend.com/api-keys."
    )
  }

  await sendResendEmail({
    to: email,
    subject: "Your CampusCare sign-in code",
    html: buildOtpEmailHtml(token),
    text: `Your CampusCare sign-in code is ${token}. It expires soon.`,
  })
}
