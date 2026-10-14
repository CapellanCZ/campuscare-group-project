import { getSiteUrl } from "@/lib/landing/seo"
import { DEFAULT_APK_PATH } from "@/lib/download/content"

/** Absolute URL encoded into the QR + used by the download button. */
export function getAndroidApkUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim()
  if (configured) {
    if (/^https?:\/\//i.test(configured)) return configured
    const path = configured.startsWith("/") ? configured : `/${configured}`
    return `${getSiteUrl()}${path}`
  }

  return `${getSiteUrl()}${DEFAULT_APK_PATH}`
}
