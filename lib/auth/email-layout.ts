import "server-only"

import { readFileSync } from "node:fs"
import path from "node:path"

/** Shared CampusCare transactional email shell (table layout for clients). */

export const EMAIL_SUPPORT = "clinic@nu-dasma.edu.ph"
export const EMAIL_LOGO_CID = "campuscare-logo"

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

/**
 * Match staff login: slate neutrals + blue-600.
 * Light header + blue PNG wordmark (same as auth page).
 */
export const emailColors = {
  pageBg: "#E8EEF7",
  cardBg: "#FFFFFF",
  cardBorder: "#D7E0EC",
  headerBg: "#FFFFFF",
  headerMuted: "#64748B",
  heading: "#0F172A",
  body: "#475569",
  primary: "#2563EB",
  primarySoft: "#EFF6FF",
  primaryText: "#FFFFFF",
  link: "#2563EB",
  mutedBox: "#F8FAFC",
  otpSlotBg: "#FFFFFF",
  otpSlotBorder: "#CBD5E1",
  otpText: "#0F172A",
  footer: "#64748B",
  divider: "#E2E8F0",
  accentBar: "#2563EB",
  chipBg: "#EFF6FF",
  chipText: "#1D4ED8",
} as const

/** Blue wordmark — intrinsic 256×135 (same asset as login). */
const LOGO_FILE = "CampusCareBlue.png"
const LOGO_DISPLAY_WIDTH = 132
const LOGO_DISPLAY_HEIGHT = 70

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
    return `${base}/images/${LOGO_FILE}`
  }
  return `https://campuscare-group-project.vercel.app/images/${LOGO_FILE}`
}

/** Inline logo for Resend (CID). Wide PNG — never force a square crop. */
export function getCampusCareLogoAttachment(): {
  filename: string
  content: Buffer
  contentId: string
  contentType: string
} {
  const filePath = path.join(process.cwd(), "public", "images", LOGO_FILE)
  return {
    filename: LOGO_FILE,
    content: readFileSync(filePath),
    contentId: EMAIL_LOGO_CID,
    contentType: "image/png",
  }
}

function emailLogoMarkup(): string {
  const logoHttp = escapeHtml(emailLogoUrl())
  const logoCid = `cid:${EMAIL_LOGO_CID}`
  // Prefer CID (inline attachment); HTTPS is a fallback for clients that strip CID.
  return `<img src="${logoCid}" alt="CampusCare" width="${LOGO_DISPLAY_WIDTH}" height="${LOGO_DISPLAY_HEIGHT}" style="display:block;width:${LOGO_DISPLAY_WIDTH}px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;" />
<!--[if !mso]><!-->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
  <img src="${logoHttp}" alt="" width="1" height="1" />
</div>
<!--<![endif]-->`
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
    ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:${emailColors.footer};">
                ${escapeHtml(input.securityNote)}
              </p>`
    : ""

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
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:540px;background-color:${emailColors.cardBg};border:1px solid ${emailColors.cardBorder};border-radius:20px;overflow:hidden;">
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,${emailColors.primary} 0%,#38BDF8 100%);background-color:${emailColors.accentBar};">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="${emailColors.headerBg}" style="background-color:${emailColors.headerBg};padding:28px 32px 20px;border-bottom:1px solid ${emailColors.divider};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle" style="padding-right:16px;">
                    ${emailLogoMarkup()}
                  </td>
                  <td valign="middle" align="right" style="width:1%;white-space:nowrap;">
                    <span style="display:inline-block;padding:6px 10px;border-radius:999px;background-color:${emailColors.chipBg};font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.04em;color:${emailColors.chipText};">
                      Secure sign-in
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:1.45;color:${emailColors.headerMuted};">
                NU Dasmariñas · Health Services Office
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 30px;font-family:${FONT};color:${emailColors.heading};">
              <h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.03em;color:${emailColors.heading};">
                ${escapeHtml(input.heading)}
              </h1>
              ${input.contentHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:30px 0 0;">
                <tr>
                  <td style="border-top:1px solid ${emailColors.divider};padding-top:22px;">
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
        <p style="margin:20px 0 0;font-family:${FONT};font-size:12px;line-height:1.45;color:${emailColors.footer};">
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

function otpDigitCell(digit: string, isLast: boolean): string {
  const pad = isLast ? "0" : "8"
  return `<td align="center" style="padding:0 ${pad}px 0 0;">
      <div style="width:46px;height:56px;border:1px solid ${emailColors.otpSlotBorder};border-radius:12px;background-color:${emailColors.otpSlotBg};box-shadow:0 1px 2px rgba(15,23,42,0.04);line-height:56px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:0;color:${emailColors.otpText};">
        ${escapeHtml(digit)}
      </div>
    </td>`
}

/**
 * OTP digit slots — mirrors login InputOTP; wide, readable, modern.
 */
export function emailOtpBox(token: string): string {
  const digits = String(token).replace(/\s+/g, "").split("")
  const cells = digits
    .map((digit, index) => otpDigitCell(digit, index === digits.length - 1))
    .join("")

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 8px;">
  <tr>
    <td align="center" style="background-color:${emailColors.primarySoft};border:1px solid #BFDBFE;border-radius:16px;padding:24px 18px;">
      <p style="margin:0 0 14px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${emailColors.chipText};">
        One-time code
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr>
          ${cells}
        </tr>
      </table>
      <p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:1.4;color:${emailColors.footer};">
        Expires in 10 minutes · Do not share this code
      </p>
    </td>
  </tr>
</table>`
}
