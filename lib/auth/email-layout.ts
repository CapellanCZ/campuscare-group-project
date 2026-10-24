import "server-only"

import { readFileSync } from "node:fs"
import path from "node:path"

/** Shared CampusCare transactional email shell (table layout for clients). */

export const EMAIL_SUPPORT = "clinic@nu-dasma.edu.ph"
/** Must match Resend attachment `contentId` and HTML `cid:` exactly. */
export const EMAIL_LOGO_CID = "logo-image"

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

/**
 * Clinic night-desk: deep navy trust + electric blue pulse.
 * Distinct from generic purple SaaS / cream-serif AI defaults.
 */
export const emailColors = {
  pageBg: "#0B1220",
  cardBg: "#FFFFFF",
  cardBorder: "#1E293B",
  navy: "#0F1C3F",
  navyDeep: "#0A1430",
  heading: "#0F172A",
  body: "#475569",
  primary: "#2563EB",
  primaryBright: "#3B82F6",
  primaryText: "#FFFFFF",
  link: "#2563EB",
  codePanel: "#0F172A",
  codeDigit: "#F8FAFC",
  codeMuted: "#94A3B8",
  footer: "#64748B",
  divider: "#E2E8F0",
  chipBg: "rgba(59,130,246,0.18)",
  chipText: "#BFDBFE",
  softBand: "#F1F5F9",
} as const

/** RGBA white wordmark for dark header (trimmed for email). */
const LOGO_FILE = "CampusCareWhite.png"
const LOGO_RELATIVE = path.join("public", "images", "email", LOGO_FILE)
const LOGO_DISPLAY_WIDTH = 148
const LOGO_DISPLAY_HEIGHT = 73

export type EmailShellVariant = "default" | "otp"

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Hosted PNG fallback when a client refuses CID. */
export function emailLogoUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || ""
  const base = raw.replace(/\/$/, "")
  if (base && !/localhost|127\.0\.0\.1/i.test(base)) {
    return `${base}/images/email/${LOGO_FILE}`
  }
  return `https://campuscare-group-project.vercel.app/images/email/${LOGO_FILE}`
}

/**
 * Inline logo for Resend — content MUST be base64 (see Resend docs).
 * Passing a raw Buffer is why the mark was blank in clients.
 */
export function getCampusCareLogoAttachment(): {
  filename: string
  content: string
  contentId: string
  contentType: string
} {
  const filePath = path.join(process.cwd(), LOGO_RELATIVE)
  return {
    filename: LOGO_FILE,
    content: readFileSync(filePath).toString("base64"),
    contentId: EMAIL_LOGO_CID,
    contentType: "image/png",
  }
}

function emailLogoMarkup(): string {
  const logoHttp = escapeHtml(emailLogoUrl())
  const logoCid = `cid:${EMAIL_LOGO_CID}`
  // CID first (inline attachment). Nested HTTPS helps some webmail proxies.
  return `<img src="${logoCid}" alt="CampusCare" width="${LOGO_DISPLAY_WIDTH}" height="${LOGO_DISPLAY_HEIGHT}" style="display:block;width:${LOGO_DISPLAY_WIDTH}px;height:auto;max-width:180px;border:0;outline:none;" />
<!--[if !mso]><!-->
<img src="${logoHttp}" alt="" width="${LOGO_DISPLAY_WIDTH}" height="${LOGO_DISPLAY_HEIGHT}" style="display:none;width:0;height:0;max-height:0;overflow:hidden;border:0;" />
<!--<![endif]-->`
}

export function wrapCampusCareEmail(input: {
  documentTitle: string
  preheader?: string
  heading: string
  contentHtml: string
  securityNote?: string
  variant?: EmailShellVariant
}): string {
  const variant = input.variant ?? "default"
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${emailColors.pageBg};">
        ${escapeHtml(input.preheader)}
      </div>`
    : ""

  const securityBlock = input.securityNote
    ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:${emailColors.footer};">
                ${escapeHtml(input.securityNote)}
              </p>`
    : ""

  const headerRow =
    variant === "otp"
      ? `<tr>
            <td bgcolor="${emailColors.navy}" style="background-color:${emailColors.navy};background-image:linear-gradient(145deg,${emailColors.navyDeep} 0%,${emailColors.navy} 48%,#1E3A8A 100%);padding:36px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    ${emailLogoMarkup()}
                  </td>
                  <td valign="middle" align="right" style="width:1%;white-space:nowrap;padding-left:12px;">
                    <span style="display:inline-block;padding:7px 12px;border-radius:999px;background-color:${emailColors.chipBg};font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${emailColors.chipText};">
                      Secure OTP
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-family:${FONT};font-size:13px;line-height:1.45;color:#93C5FD;">
                NU Dasmariñas · Health Services Office
              </p>
              <h1 style="margin:22px 0 0;font-family:${FONT};font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-0.035em;color:#FFFFFF;">
                ${escapeHtml(input.heading)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="height:3px;line-height:3px;font-size:0;background-color:${emailColors.primaryBright};">&nbsp;</td>
          </tr>`
      : `<tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:${emailColors.primary};">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="${emailColors.navy}" style="background-color:${emailColors.navy};padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">${emailLogoMarkup()}</td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:1.45;color:#93C5FD;">
                NU Dasmariñas · Health Services Office
              </p>
            </td>
          </tr>`

  const bodyHeading =
    variant === "otp"
      ? ""
      : `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-0.03em;color:${emailColors.heading};">
                ${escapeHtml(input.heading)}
              </h1>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(input.documentTitle)}</title>
</head>
<body style="margin:0;padding:0;background-color:${emailColors.pageBg};">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${emailColors.pageBg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:${emailColors.cardBg};border-radius:24px;overflow:hidden;border:1px solid ${emailColors.cardBorder};">
          ${headerRow}
          <tr>
            <td style="padding:${variant === "otp" ? "28px 32px 32px" : "32px"};font-family:${FONT};color:${emailColors.heading};background-color:${emailColors.cardBg};">
              ${bodyHeading}
              ${input.contentHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 0;">
                <tr>
                  <td style="border-top:1px solid ${emailColors.divider};padding-top:20px;">
                    ${securityBlock}
                    <p style="margin:0;font-size:13px;line-height:1.55;color:${emailColors.footer};">
                      Need help? Contact us at
                      <a href="mailto:${EMAIL_SUPPORT}" style="color:${emailColors.link};text-decoration:none;font-weight:600;">${EMAIL_SUPPORT}</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-family:${FONT};font-size:12px;line-height:1.45;color:#94A3B8;">
          © CampusCare · NU Dasmariñas HSO
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function emailPrimaryButton(href: string, label: string): string {
  const safeHref = escapeHtml(href)
  const safeLabel = escapeHtml(label)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px auto;">
  <tr>
    <td align="center" bgcolor="${emailColors.primary}" style="border-radius:12px;background-color:${emailColors.primary};">
      <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${emailColors.primaryText};text-decoration:none;border-radius:12px;">
        ${safeLabel}
      </a>
    </td>
  </tr>
</table>`
}

export function emailBodyParagraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${emailColors.body};">${html}</p>`
}

/**
 * Hero OTP — one dark stage, spaced digits. The “wow” of the email.
 */
export function emailOtpBox(token: string): string {
  const digits = String(token).replace(/\s+/g, "").split("")
  const spaced = escapeHtml(digits.join("  "))

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 4px;">
  <tr>
    <td align="center" bgcolor="${emailColors.codePanel}" style="background-color:${emailColors.codePanel};background-image:linear-gradient(160deg,#0F172A 0%,#1E293B 55%,#0F172A 100%);border-radius:18px;padding:28px 20px 24px;">
      <p style="margin:0 0 16px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${emailColors.codeMuted};">
        One-time code
      </p>
      <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:0.12em;line-height:1.2;color:${emailColors.codeDigit};">
        ${spaced}
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto 0;">
        <tr>
          <td style="padding:8px 14px;border-radius:999px;background-color:rgba(37,99,235,0.22);font-family:${FONT};font-size:12px;font-weight:600;color:#BFDBFE;">
            Expires in 10 minutes
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}
