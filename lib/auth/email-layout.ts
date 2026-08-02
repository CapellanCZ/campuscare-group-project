import "server-only"

import { readFileSync } from "node:fs"
import path from "node:path"

/** Shared CampusCare transactional email shell (table layout for clients). */

export const EMAIL_SUPPORT = "clinic@nu-dasma.edu.ph"
export const EMAIL_LOGO_CID = "campuscare-logo"

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

/**
 * Approximate light-mode `--primary: oklch(0.546 0.215 262.88)` for email clients.
 * Lean into CampusCare blue throughout the template.
 */
export const emailColors = {
  pageBg: "#EEF2FF",
  cardBg: "#FFFFFF",
  cardBorder: "#C7D2FE",
  headerBg: "#4F6BED",
  headerText: "#FFFFFF",
  headerMuted: "#E0E7FF",
  heading: "#3730A3",
  body: "#475569",
  primary: "#4F6BED",
  primaryText: "#FFFFFF",
  link: "#4F6BED",
  mutedBox: "#EEF2FF",
  otpText: "#312E81",
  footer: "#64748B",
  divider: "#C7D2FE",
  accentBar: "#6366F1",
} as const

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Public HTTPS fallback when CID is unsupported; never use localhost. */
export function emailLogoUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || ""
  const base = raw.replace(/\/$/, "")
  if (base && !/localhost|127\.0\.0\.1/i.test(base)) {
    return `${base}/images/CampusCareWhite.png`
  }
  return "https://campuscare-group-project.vercel.app/images/CampusCareWhite.png"
}

/** Inline logo for Resend (fixes broken images when SITE_URL is localhost). */
export function getCampusCareLogoAttachment(): {
  filename: string
  content: Buffer
  contentId: string
  contentType: string
} {
  const filePath = path.join(
    process.cwd(),
    "public",
    "images",
    "CampusCareWhite.png"
  )
  return {
    filename: "CampusCareWhite.png",
    content: readFileSync(filePath),
    contentId: EMAIL_LOGO_CID,
    contentType: "image/png",
  }
}

export function wrapCampusCareEmail(input: {
  documentTitle: string
  preheader?: string
  heading: string
  contentHtml: string
  /** Shown after the divider, above the support line */
  securityNote?: string
}): string {
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${emailColors.pageBg};">
        ${escapeHtml(input.preheader)}
      </div>`
    : ""

  const securityBlock = input.securityNote
    ? `<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${emailColors.footer};">
                ${escapeHtml(input.securityNote)}
              </p>`
    : ""

  const logoHttp = escapeHtml(emailLogoUrl())
  const logoCid = `cid:${EMAIL_LOGO_CID}`

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
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background-color:${emailColors.cardBg};border:1px solid ${emailColors.cardBorder};border-radius:16px;overflow:hidden;">
          <tr>
            <td bgcolor="${emailColors.headerBg}" style="background-color:${emailColors.headerBg};padding:22px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle" style="padding-right:12px;width:48px;">
                    <img src="${logoCid}" alt="CampusCare" width="44" height="44" style="display:block;width:44px;height:44px;border:0;outline:none;" />
                    <!--[if !mso]><!-->
                    <div style="display:none;max-height:0;overflow:hidden;">
                      <img src="${logoHttp}" alt="" width="1" height="1" />
                    </div>
                    <!--<![endif]-->
                  </td>
                  <td valign="middle">
                    <p style="margin:0 0 2px;font-size:17px;font-weight:700;letter-spacing:-0.01em;color:${emailColors.headerText};">
                      CampusCare
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.4;color:${emailColors.headerMuted};">
                      NU Dasmariñas · Health Services Office
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:${emailColors.accentBar};">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 36px;font-family:${FONT};color:${emailColors.heading};">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:${emailColors.heading};">
                ${escapeHtml(input.heading)}
              </h1>
              ${input.contentHtml}
              <hr style="border:none;border-top:1px solid ${emailColors.divider};margin:28px 0 20px;" />
              ${securityBlock}
              <p style="margin:0;font-size:13px;line-height:1.5;color:${emailColors.footer};">
                Need help? Contact us at
                <a href="mailto:${EMAIL_SUPPORT}" style="color:${emailColors.link};text-decoration:underline;">${EMAIL_SUPPORT}</a>.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:${FONT};font-size:12px;line-height:1.4;color:${emailColors.footer};">
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
  <tr>
    <td align="center" bgcolor="${emailColors.primary}" style="border-radius:10px;background-color:${emailColors.primary};">
      <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${emailColors.primaryText};text-decoration:none;border-radius:10px;">
        ${safeLabel}
      </a>
    </td>
  </tr>
</table>`
}

export function emailBodyParagraph(html: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${emailColors.body};">${html}</p>`
}

/** OTP shown as contiguous digits (no spaces between numbers). */
export function emailOtpBox(token: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
  <tr>
    <td align="center" style="background-color:${emailColors.mutedBox};border:1px solid ${emailColors.cardBorder};border-radius:12px;padding:22px 16px;">
      <p style="margin:0;font-family:${FONT};font-size:32px;font-weight:700;letter-spacing:0.08em;line-height:1.2;color:${emailColors.otpText};">
        ${escapeHtml(token)}
      </p>
    </td>
  </tr>
</table>`
}
