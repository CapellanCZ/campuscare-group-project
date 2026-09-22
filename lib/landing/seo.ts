import type { Metadata } from "next"

import { siteRoutes } from "@/lib/site/routes"

/** Absolute site origin for metadata, sitemap, and robots. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "")
    return `https://${host}`
  }

  return "http://localhost:3000"
}

export const landingSeo = {
  title: "CampusCare · NU Dasmariñas Health Services",
  description:
    "CampusCare helps the NU Dasmariñas Health Services Office manage consultations, queues, patient records, and campus health notices in one modern workspace.",
  brand: "CampusCare",
  ogImagePath: "/images/CampusCareBlue.png",
} as const

export function buildLandingMetadata(): Metadata {
  const siteUrl = getSiteUrl()
  const ogImage = `${siteUrl}${landingSeo.ogImagePath}`

  return {
    title: {
      absolute: landingSeo.title,
    },
    description: landingSeo.description,
    applicationName: landingSeo.brand,
    authors: [{ name: "CampusCare · NU Dasmariñas HSO" }],
    creator: landingSeo.brand,
    publisher: "NU Dasmariñas Health Services Office",
    keywords: [
      "CampusCare",
      "NU Dasmariñas",
      "Health Services Office",
      "campus clinic",
      "queue management",
      "medical certificates",
    ],
    alternates: {
      canonical: siteRoutes.home,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_PH",
      url: siteRoutes.home,
      siteName: landingSeo.brand,
      title: landingSeo.title,
      description: landingSeo.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "CampusCare — NU Dasmariñas Health Services",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: landingSeo.title,
      description: landingSeo.description,
      images: [ogImage],
    },
  }
}
