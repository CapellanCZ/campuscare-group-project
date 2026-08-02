import "server-only"

import { buildActivationEmail } from "@/lib/auth/email-templates"
import { sendResendEmail } from "@/lib/auth/resend-client"

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
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

  const message = buildActivationEmail({
    fullName,
    role: input.role,
    loginUrl,
    email,
  })

  await sendResendEmail({
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  })
}
