import type { Metadata } from "next"

import { getSiteUrl, landingSeo } from "@/lib/landing/seo"

const TITLE = "Patient Records"
const DESCRIPTION =
  "CampusCare Patient Records for the NU Dasmariñas Health Services Office — search, import, and manage student, faculty, and employee clinical records."

/**
 * Staff Patient Records SEO.
 * Authenticated clinical data must not be indexed; metadata still sets a clear
 * document title/description for tabs and internal tooling.
 */
export const patientRecordsPageMetadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: landingSeo.brand,
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
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: landingSeo.brand,
    title: `${TITLE} · CampusCare`,
    description: DESCRIPTION,
    url: `${getSiteUrl()}/nurse/patients`,
    images: [
      {
        url: `${getSiteUrl()}${landingSeo.ogImagePath}`,
        width: 1200,
        height: 630,
        alt: "CampusCare — NU Dasmariñas Health Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · CampusCare`,
    description: DESCRIPTION,
    images: [`${getSiteUrl()}${landingSeo.ogImagePath}`],
  },
}
