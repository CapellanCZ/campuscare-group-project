/**
 * Restrict browser CORS to known CampusCare web origins.
 * Mobile / native clients typically omit Origin and still work.
 */

const DEFAULT_ORIGINS = [
  "https://campuscare.click",
  "https://www.campuscare.click",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]

function allowedOrigins(): string[] {
  const fromEnv = Deno.env.get("ALLOWED_WEB_ORIGINS")?.trim()
  if (!fromEnv) return DEFAULT_ORIGINS
  return fromEnv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

export function corsHeadersFor(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin")?.trim() ?? ""
  const allowlist = allowedOrigins()
  const allowOrigin =
    origin && allowlist.includes(origin) ? origin : allowlist[0] ?? "null"

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  }
}
