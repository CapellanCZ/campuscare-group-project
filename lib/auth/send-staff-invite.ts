import "server-only"

import { sendResendEmail } from "@/lib/auth/resend-client"

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
  loginUrl: string
}) {
  return `<h2>You're invited to CampusCare</h2>
<p>Hi ${input.fullName},</p>
<p>You've been invited as <strong>${roleLabel(input.role)}</strong> at NU Dasmariñas Health Services Office.</p>
<p><a href="${input.loginUrl}" style="display:inline-block;margin:16px 0;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in to CampusCare</a></p>
<p>Or open this link: <a href="${input.loginUrl}">${input.loginUrl}</a></p>
<p>Use the email this invite was sent to. If you did not expect this invite, you can ignore this email.</p>`
}

/**
 * Deliver the staff invite through Resend with a link to the app login page.
 */
export async function sendStaffInviteEmail(input: {
  email: string
  fullName: string
  role: string
}): Promise<void> {
  const email = input.email.trim().toLowerCase()
  const loginUrl = `${siteUrl()}/login`
  const fullName = input.fullName.trim() || email

  await sendResendEmail({
    to: email,
    subject: "You're invited to CampusCare",
    html: buildInviteEmailHtml({
      fullName,
      role: input.role,
      loginUrl,
    }),
    text: `Hi ${fullName}, you've been invited as ${roleLabel(input.role)} on CampusCare. Sign in at: ${loginUrl}`,
  })
}
