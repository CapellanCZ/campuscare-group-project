import type { Metadata } from "next"

import { LegalDocumentPage } from "@/components/legal/legal-document-page"
import { getSiteUrl } from "@/lib/landing/seo"
import { dataPrivacyNotice } from "@/lib/legal/content"
import { siteRoutes } from "@/lib/site/routes"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "Data Privacy Notice",
  description:
    "Data Privacy Notice for CampusCare and the NU Dasmariñas Health Services Office.",
  alternates: { canonical: `${siteUrl}${siteRoutes.dataPrivacy}` },
  robots: { index: true, follow: true },
}

export default function DataPrivacyPage() {
  return <LegalDocumentPage document={dataPrivacyNotice} />
}
