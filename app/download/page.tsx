import type { Metadata } from "next"

import { DownloadPage } from "@/components/download/download-page"
import { getSiteUrl } from "@/lib/landing/seo"
import { siteRoutes } from "@/lib/site/routes"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "Download CampusCare for Android",
  description:
    "Scan the QR code or download the CampusCare Android APK for NU Dasmariñas students and faculty.",
  alternates: { canonical: `${siteUrl}${siteRoutes.download}` },
  openGraph: {
    title: "Download CampusCare for Android",
    description:
      "Official CampusCare APK for NU Dasmariñas students and faculty — scan the QR or download directly.",
    url: `${siteUrl}${siteRoutes.download}`,
  },
  robots: { index: true, follow: true },
}

export default function DownloadRoutePage() {
  return <DownloadPage />
}
