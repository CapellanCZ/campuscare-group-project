import { getSiteUrl } from "@/lib/landing/seo"

/**
 * Configured Android download destination from env.
 * Returns null when missing/invalid — never invents a localhost or placeholder URL.
 *
 * Set: NEXT_PUBLIC_ANDROID_APK_URL=https://…/campuscare.apk
 * (or a stable Expo / EAS / Play / CDN link — not a short-lived Expo Go tunnel QR)
 */
export function getConfiguredAndroidApkUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim()
  if (!raw) return null

  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw)
      if (url.protocol !== "http:" && url.protocol !== "https:") return null
      return url.toString()
    }

    // Site-relative path → absolute against the public site origin
    if (raw.startsWith("/")) {
      return `${getSiteUrl()}${raw}`
    }
  } catch {
    return null
  }

  return null
}

/** True when a real download destination is configured. */
export function hasAndroidApkUrl(): boolean {
  return getConfiguredAndroidApkUrl() !== null
}
