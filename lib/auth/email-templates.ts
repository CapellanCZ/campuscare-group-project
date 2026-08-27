import "server-only"

import {
  EMAIL_SUPPORT,
  emailBodyParagraph,
  emailColors,
  emailOtpBox,
  emailPrimaryButton,
  escapeHtml,
  wrapCampusCareEmail,
} from "@/lib/auth/email-layout"

export type AuthEmailPayload = {
  subject: string
  html: string
  text: string
}

function roleLabel(role: string) {
  if (!role) return "staff"
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function greetingName(fullName: string, email?: string) {
  const trimmed = fullName.trim()
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0]
    if (first) return first
  }
  const local = email?.split("@")[0]?.trim()
  return local || "there"
}

/** Staff invite → Account Activation email */
export function buildActivationEmail(input: {
  fullName: string
  role: string
  /** Magic link that completes activation (clears invite_pending). */
  activationUrl: string
  email?: string
}): AuthEmailPayload {
  const name = greetingName(input.fullName, input.email)
  const role = roleLabel(input.role)
  const safeName = escapeHtml(name)
  const safeRole = escapeHtml(role)
  const safeUrl = escapeHtml(input.activationUrl)

  const contentHtml = [
    emailBodyParagraph(`Hi ${safeName},`),
    emailBodyParagraph(
      `You've been invited as <strong style="color:#3730A3;">${safeRole}</strong> on CampusCare for the NU Dasmariñas Health Services Office.`
    ),
    emailBodyParagraph(
      `Click below to activate your account. After activation, return to the login page and sign in with a one-time code sent to this email.`
    ),
    emailPrimaryButton(input.activationUrl, "Activate Account"),
    emailBodyParagraph(
      `If the button doesn't work, copy and paste this link into your browser:`
    ),
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;word-break:break-all;"><a href="${safeUrl}" style="color:${emailColors.link};text-decoration:underline;">${safeUrl}</a></p>`,
  ].join("")

  const html = wrapCampusCareEmail({
    documentTitle: "Activate your CampusCare account",
    preheader:
      "You've been invited to the NU Dasmariñas Health Services Office clinic workspace.",
    heading: "Activate your account",
    contentHtml,
    securityNote:
      "If you didn't expect this invite, you can safely ignore this email.",
  })

  const text = [
    "Activate your CampusCare account",
    "",
    `Hi ${name},`,
    "",
    `You've been invited as ${role} on CampusCare (NU Dasmariñas HSO).`,
    `Open this link to activate your account: ${input.activationUrl}`,
    "After activating, sign in at the login page with a one-time code.",
    "",
    "If you didn't expect this invite, ignore this email.",
    `Help: ${EMAIL_SUPPORT}`,
  ].join("\n")

  return {
    subject: "Activate your CampusCare account",
    html,
    text,
  }
}

/** Login OTP → One-Time Pin email */
export function buildOtpEmail(token: string): AuthEmailPayload {
  const contentHtml = [
    emailBodyParagraph(
      "Use the code below to sign in to CampusCare. It expires in 10 minutes."
    ),
    emailOtpBox(token),
    emailBodyParagraph(
      "If you didn't request this code, you can safely ignore it — someone may have entered your email by mistake."
    ),
  ].join("")

  const html = wrapCampusCareEmail({
    documentTitle: "Your CampusCare one-time login code",
    preheader: "Use this code to sign in. It expires soon.",
    heading: "Your one-time login code",
    contentHtml,
  })

  const text = [
    `Your CampusCare one-time login code is ${token}.`,
    "It expires in about 10 minutes.",
    "If you didn't request this, ignore the email.",
    `Help: ${EMAIL_SUPPORT}`,
  ].join("\n")

  return {
    subject: "Your CampusCare one-time login code",
    html,
    text,
  }
}
