import "server-only"

import { Resend } from "resend"

import { getCampusCareLogoAttachment } from "@/lib/auth/email-layout"

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function resendFromAddress() {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "nud-hso@campuscare.click"
  // Keep From display name ASCII-safe for SMTP providers.
  const fromName =
    process.env.RESEND_FROM_NAME?.trim().replace(/[^\x20-\x7E]/g, "") ||
    "NU Dasmarinas Health Services Office"
  return `${fromName} <${fromEmail}>`
}

export async function sendResendEmail(input: {
  to: string
  subject: string
  html: string
  text: string
  /** When true (default), inline CampusCare logo via CID for reliable display. */
  includeLogo?: boolean
}) {
  const resend = new Resend(requiredEnv("RESEND_API_KEY"))
  const includeLogo = input.includeLogo !== false
  const logo = includeLogo ? getCampusCareLogoAttachment() : null

  const { error } = await resend.emails.send({
    from: resendFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: logo
      ? [
          {
            filename: logo.filename,
            content: logo.content,
            contentId: logo.contentId,
            contentType: logo.contentType,
          },
        ]
      : undefined,
  })

  if (error) {
    throw new Error(
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "Could not send email via Resend."
    )
  }
}
