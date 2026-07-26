import "server-only"

import { Resend } from "resend"

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
}) {
  const resend = new Resend(requiredEnv("RESEND_API_KEY"))
  const { error } = await resend.emails.send({
    from: resendFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  if (error) {
    throw new Error(
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: string }).message)
        : "Could not send email via Resend."
    )
  }
}
