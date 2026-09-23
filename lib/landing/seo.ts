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

/** Private clinic surfaces must not be indexed. */
export const privateSurfaceMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export function buildLandingJsonLd() {
  const siteUrl = getSiteUrl()
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: landingSeo.brand,
        description: landingSeo.description,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-PH",
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "NU Dasmariñas Health Services Office",
        alternateName: landingSeo.brand,
        url: siteUrl,
        logo: `${siteUrl}${landingSeo.ogImagePath}`,
        areaServed: {
          "@type": "Place",
          name: "NU Dasmariñas",
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#app`,
        name: landingSeo.brand,
        url: siteUrl,
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        description: landingSeo.description,
        provider: { "@id": `${siteUrl}/#organization` },
      },
    ],
  }
}

export function buildLandingMetadata(): Metadata {
  const siteUrl = getSiteUrl()
  const ogImage = `${siteUrl}${landingSeo.ogImagePath}`
  const canonical = `${siteUrl}${siteRoutes.home}`

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
      canonical,
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
      url: canonical,
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
