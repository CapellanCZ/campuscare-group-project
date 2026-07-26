import "server-only"

import { sendResendEmail } from "@/lib/auth/resend-client"
import { createAdminClient } from "@/lib/supabase/admin"

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

function roleLabel(role: string) {
  if (!role) return "staff"
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function buildInviteEmailHtml(input: {
  fullName: string
  role: string
  actionLink: string
}) {
  return `<h2>You're invited to CampusCare</h2>
<p>Hi ${input.fullName},</p>
<p>You've been invited as <strong>${roleLabel(input.role)}</strong> at NU Dasmariñas Health Services Office.</p>
<p><a href="${input.actionLink}" style="display:inline-block;margin:16px 0;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Accept invite &amp; sign in</a></p>
<p>Or open this link: <a href="${input.actionLink}">${input.actionLink}</a></p>
<p>This link expires soon. If you did not expect this invite, you can ignore this email.</p>`
}

/**
 * Generate a Supabase magic link and deliver the staff invite through Resend
 * (does not use Supabase Auth's built-in mailer).
 */
export async function sendStaffInviteEmail(input: {
  email: string
  fullName: string
  role: string
}): Promise<void> {
  const admin = createAdminClient()
  const email = input.email.trim().toLowerCase()
  const redirectTo = `${siteUrl()}/auth/callback`

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo,
    },
  })

  if (error) {
    throw error
  }

  const actionLink = data.properties.action_link?.trim() ?? ""
  if (!actionLink) {
    throw new Error("Could not generate an invite sign-in link.")
  }

  const fullName = input.fullName.trim() || email
  await sendResendEmail({
    to: email,
    subject: "You're invited to CampusCare",
    html: buildInviteEmailHtml({
      fullName,
      role: input.role,
      actionLink,
    }),
    text: `Hi ${fullName}, you've been invited as ${roleLabel(input.role)} on CampusCare. Accept your invite and sign in: ${actionLink}`,
  })
}
