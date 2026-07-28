/** Public site origin for auth redirects (no trailing slash). */
export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  return "http://localhost:3000"
}

export function authCallbackUrl() {
  return `${siteOrigin()}/auth/callback`
}
