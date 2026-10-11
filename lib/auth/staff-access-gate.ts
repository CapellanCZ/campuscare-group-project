import type { NextResponse } from "next/server"

/**
 * Short-lived httpOnly gate cookie set by proxy after membership checks.
 * RSC reads it to skip a duplicate clinic_members / admin_accounts round-trip.
 * Never trusted without matching auth.uid(); never used as sole authorization.
 *
 * Uses Web Crypto so it runs in the Edge proxy runtime.
 */

export const STAFF_ACCESS_GATE_COOKIE = "cc_staff_gate"

const GATE_TTL_SEC = 90
const GATE_VERSION = 1

export type StaffAccessGatePayload = {
  v: number
  /** Auth user id */
  u: string
  /** Resolved clinic role (nurse | physician | dentist | admin | queue_display) */
  r: string
  /** Membership / approved clinic access */
  m: 0 | 1
  /** Unix expiry (seconds) */
  e: number
}

function gateSecret(): string | null {
  const secret =
    process.env.STAFF_ACCESS_GATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return secret || null
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ""
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]!)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

async function sign(body: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret)
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  )
  return bytesToBase64Url(sig)
}

async function verify(body: string, sig: string, secret: string): Promise<boolean> {
  const key = await importHmacKey(secret)
  const sigBytes = base64UrlToBytes(sig)
  const sigCopy = new Uint8Array(sigBytes.byteLength)
  sigCopy.set(sigBytes)
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigCopy,
    new TextEncoder().encode(body)
  )
}

export async function encodeStaffAccessGate(
  payload: Omit<StaffAccessGatePayload, "v" | "e"> & { e?: number }
): Promise<string | null> {
  const secret = gateSecret()
  if (!secret) return null

  const full: StaffAccessGatePayload = {
    v: GATE_VERSION,
    u: payload.u,
    r: payload.r,
    m: payload.m,
    e: payload.e ?? Math.floor(Date.now() / 1000) + GATE_TTL_SEC,
  }
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(full)))
  const sig = await sign(body, secret)
  return `${body}.${sig}`
}

export async function decodeStaffAccessGate(
  raw: string | undefined | null
): Promise<StaffAccessGatePayload | null> {
  if (!raw) return null
  const secret = gateSecret()
  if (!secret) return null

  const [body, sig] = raw.split(".")
  if (!body || !sig) return null
  if (!(await verify(body, sig, secret))) return null

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body))
    const parsed = JSON.parse(json) as StaffAccessGatePayload
    if (parsed.v !== GATE_VERSION) return null
    if (!parsed.u || !parsed.r) return null
    if (parsed.e < Math.floor(Date.now() / 1000)) return null
    if (parsed.m !== 0 && parsed.m !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export async function setStaffAccessGateCookie(
  response: NextResponse,
  payload: Omit<StaffAccessGatePayload, "v" | "e"> & { e?: number }
) {
  const value = await encodeStaffAccessGate(payload)
  if (!value) return
  response.cookies.set(STAFF_ACCESS_GATE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_TTL_SEC,
  })
}

export function clearStaffAccessGateCookie(response: NextResponse) {
  response.cookies.set(STAFF_ACCESS_GATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
