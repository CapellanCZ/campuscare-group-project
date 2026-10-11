/**
 * Browser security headers for Next.js responses.
 * Kept separate from next.config so CSP rules stay reviewable and testable.
 */

const isDev = process.env.NODE_ENV === "development"

function supabaseOrigins(): string[] {
  const wildcards = ["https://*.supabase.co", "wss://*.supabase.co"]
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return wildcards
  try {
    const origin = new URL(raw).origin
    const wsOrigin = origin
      .replace(/^https:/i, "wss:")
      .replace(/^http:/i, "ws:")
    return [origin, wsOrigin, ...wildcards]
  } catch {
    return wildcards
  }
}

/**
 * Production-oriented CSP that still allows Next.js + next-themes inline boot,
 * Supabase Auth/Realtime/Storage, and local blob previews/exports.
 *
 * Nonce/strict-dynamic CSP would force every route dynamic; this baseline still
 * satisfies securityheaders.com and blocks most XSS asset injection.
 */
export function buildContentSecurityPolicy(): string {
  const connect = [
    "'self'",
    ...supabaseOrigins(),
    // Vercel preview toolbar / speed insights (safe no-op if unused)
    "https://vercel.live",
    "https://*.vercel-insights.com",
    "https://va.vercel-scripts.com",
  ]

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://vercel.live",
  ]

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "frame-src 'self' https://vercel.live",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]

  return directives.join("; ")
}

export function buildSecurityHeaders(): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(),
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ]

  // HSTS is also set by Vercel; keep it in-app for non-Vercel hosts.
  if (!isDev) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    })
  }

  return headers
}
