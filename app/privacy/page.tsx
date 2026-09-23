import type { Metadata } from "next"

import { LegalDocumentPage } from "@/components/legal/legal-document-page"
import { getSiteUrl } from "@/lib/landing/seo"
import { privacyPolicy } from "@/lib/legal/content"
import { siteRoutes } from "@/lib/site/routes"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for CampusCare and the NU Dasmariñas Health Services Office.",
  alternates: { canonical: `${siteUrl}${siteRoutes.privacy}` },
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyPolicy} />
}
