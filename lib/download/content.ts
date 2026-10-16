import { siteRoutes } from "@/lib/site/routes"

/**
 * Configure the live Android destination with:
 * NEXT_PUBLIC_ANDROID_APK_URL=https://…/campuscare.apk
 * Prefer a stable host (CDN APK, Play, EAS) — Expo Go project QR links expire.
 */
export const downloadCopy = {
  headline: "Download CampusCare",
  description: "Android app for NU Dasmariñas students and faculty.",
  qrCaption: "Point your camera here",
  primaryCta: "Download APK",
  secondaryCta: "Back to home",
  secondaryHref: siteRoutes.home,
} as const
