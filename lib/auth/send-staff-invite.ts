import "server-only"

import { buildActivationEmail } from "@/lib/auth/email-templates"
import { sendResendEmail } from "@/lib/auth/resend-client"
import { createAdminClient } from "@/lib/supabase/admin"

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  )
}

/**
 * Deliver the staff invite through Resend with an app-hosted activation link.
 * Uses hashed_token + /auth/activate (verifyOtp) so PKCE callback is not required.
 */
export async function sendStaffInviteEmail(input: {
  email: string
  fullName: string
  role: string
}): Promise<void> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim() || email
  const site = siteUrl()

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })

  if (error) {
    throw error
  }

  const tokenHash = data.properties?.hashed_token?.trim()
  if (!tokenHash) {
    throw new Error("Could not create an activation link. Please try again.")
  }

  const activationUrl = `${site}/auth/activate?token_hash=${encodeURIComponent(tokenHash)}&type=email`

  const message = buildActivationEmail({
    fullName,
    role: input.role,
    activationUrl,
    email,
  })

  await sendResendEmail({
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  })
}
