/**
 * Web OTP sign-in: generate email OTP via Auth Admin + deliver with Resend.
 *
 * Important (new API keys / ES256 signing keys):
 * - `sb_secret_…` is NOT a JWT. Do not put it on `Authorization: Bearer`.
 * - Send Auth Admin credentials on the `apikey` header only.
 * - Prefer `SUPABASE_SECRET_KEYS` JSON (`default`) injected by the platform.
 * - Legacy HS256 service_role JWTs must NOT be sent as Bearer — Auth verifies
 *   Bearer with ES256 JWKS and fails with: unrecognized JWT kid <nil>.
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const REQ_COOLDOWN_MS = 60 * 1000
const DEFAULT_EMAIL_FROM =
  "NU Dasmarinas Health Services Office <nud-hso@campuscare.click>"

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
}

function formatResendError(raw: string, status: number): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string }
    const msg = String(parsed.message || "").trim()
    if (/invalid/i.test(msg) && /api key/i.test(msg)) {
      return "Email could not be sent: Resend API key is invalid."
    }
    if (msg) return `Email could not be sent: ${msg}`
  } catch {
    /* use raw */
  }
  return `Email could not be sent (Resend HTTP ${status}).`
}

/** Resolve admin API key for Auth Admin calls. Prefer modern sb_secret. */
function resolveAdminApiKey(): string | null {
  const candidates: string[] = []

  const fromJson = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim()
  if (fromJson) {
    try {
      const parsed = JSON.parse(fromJson) as Record<string, string>
      const def = parsed.default?.trim()
      if (def) candidates.push(def)
      for (const value of Object.values(parsed)) {
        if (typeof value === "string" && value.trim()) {
          candidates.push(value.trim())
        }
      }
    } catch {
      /* fall through */
    }
  }

  for (const envName of ["SB_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const) {
    const value = Deno.env.get(envName)?.trim()
    if (value) candidates.push(value)
  }

  const modern = candidates.find((key) => key.startsWith("sb_secret_"))
  if (modern) return modern

  return candidates[0] ?? null
}

type GenerateLinkResult = {
  email_otp?: string
  action_link?: string
  properties?: { email_otp?: string; action_link?: string }
}

async function generateEmailOtp(params: {
  supabaseUrl: string
  apiKey: string
  email: string
  redirectTo: string
}): Promise<{ otp: string } | { error: string }> {
  // Always apikey-only for Auth Admin (never Authorization: Bearer).
  const headers: Record<string, string> = {
    apikey: params.apiKey,
    "Content-Type": "application/json",
    "User-Agent": "supabase-edge-runtime/web-sign-in-otp",
  }

  const res = await fetch(`${params.supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "magiclink",
      email: params.email,
      options: { redirect_to: params.redirectTo },
    }),
  })

  const raw = await res.text()
  if (!res.ok) {
    try {
      const parsed = JSON.parse(raw) as {
        message?: string
        error?: string
        msg?: string
      }
      return {
        error: String(
          parsed.message ||
            parsed.error ||
            parsed.msg ||
            raw ||
            "Could not start sign-in."
        ),
      }
    } catch {
      return { error: raw || `Auth Admin HTTP ${res.status}` }
    }
  }

  const data = JSON.parse(raw) as GenerateLinkResult
  const otp = String(
    data.email_otp || data.properties?.email_otp || ""
  ).trim()
  if (!otp) {
    return { error: "Could not generate verification code." }
  }
  return { otp }
}

async function sendOtpEmail(params: {
  to: string
  code: string
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim()
  if (!apiKey) return { sent: false, error: "RESEND_API_KEY not configured." }

  const from =
    Deno.env.get("WEB_SIGN_IN_EMAIL_FROM")?.trim() ||
    Deno.env.get("STAFF_WELCOME_EMAIL_FROM")?.trim() ||
    Deno.env.get("LOGIN_OTP_EMAIL_FROM")?.trim() ||
    DEFAULT_EMAIL_FROM

  const codeHtml = escapeHtml(params.code)
  const subject = "Your CampusCare verification code"

  const html = `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;">
  <tr><td style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:22px;border-radius:10px 10px 0 0;">
  <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">CampusCare</p>
  <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.88);">Sign in</p></td></tr>
  <tr><td style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
  <p style="margin:0 0 12px;color:#0f172a;font-size:16px;font-weight:600;">Your one-time password</p>
  <p style="margin:0 0 18px;color:#64748b;font-size:14px;line-height:1.55;">Enter this 6-digit code on the CampusCare sign-in page. It expires shortly.</p>
  <p style="margin:0 0 20px;text-align:center;font-size:28px;font-weight:700;letter-spacing:0.28em;color:#1d4ed8;font-family:ui-monospace,monospace;">${codeHtml}</p>
  <p style="margin:0;font-size:13px;color:#64748b;">If you did not request this, you can ignore this email.</p>
  </td></tr></table></body></html>`

  const text = `Your CampusCare one-time password is: ${params.code}\n\nEnter this code on the sign-in page. If you did not request this, ignore this email.\n`

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject,
      html,
      text,
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    return { sent: false, error: formatResendError(t, res.status) }
  }
  return { sent: true }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim()
    const apiKey = resolveAdminApiKey()
    if (!supabaseUrl || !apiKey) {
      return json({ ok: false, error: "Server misconfigured." }, 500)
    }

    const body = (await req.json()) as Record<string, unknown>
    const email = normalizeEmail(body.email)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: "Enter a valid email address." }, 400)
    }

    const redirectTo =
      String(body.redirectTo ?? "").trim() ||
      `${Deno.env.get("SITE_URL")?.trim() || "http://localhost:3000"}/auth/callback`

    const generated = await generateEmailOtp({
      supabaseUrl,
      apiKey,
      email,
      redirectTo,
    })

    if ("error" in generated) {
      return json({ ok: false, error: generated.error }, 500)
    }

    const send = await sendOtpEmail({
      to: email,
      code: generated.otp,
    })
    if (!send.sent) {
      return json(
        { ok: false, error: send.error || "Could not send email." },
        500
      )
    }

    const atDomain = email.split("@")[1] || ""
    return json({
      ok: true,
      emailSentMask: `${email.slice(0, 2)}***@${atDomain}`,
      nextResendAt: new Date(Date.now() + REQ_COOLDOWN_MS).toISOString(),
    })
  } catch (err) {
    console.error("[web-sign-in-otp]", err)
    return json({ ok: false, error: "Unexpected server error." }, 500)
  }
})
