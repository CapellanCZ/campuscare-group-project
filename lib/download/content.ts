import { siteRoutes } from "@/lib/site/routes"

/**
 * Public path for the student/faculty Android build.
 * Override with NEXT_PUBLIC_ANDROID_APK_URL for CDN / external hosting.
 */
export const DEFAULT_APK_PATH = "/downloads/campuscare.apk"

export const downloadCopy = {
  headline: "Download CampusCare",
  description: "Android app for NU Dasmariñas students and faculty.",
  qrCaption: "Point your camera here",
  primaryCta: "Download APK",
  secondaryCta: "Back to home",
  secondaryHref: siteRoutes.home,
} as const
