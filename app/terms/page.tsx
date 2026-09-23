import type { Metadata } from "next"

import { LegalDocumentPage } from "@/components/legal/legal-document-page"
import { getSiteUrl } from "@/lib/landing/seo"
import { termsOfUse } from "@/lib/legal/content"
import { siteRoutes } from "@/lib/site/routes"

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of Use for CampusCare and the NU Dasmariñas Health Services Office.",
  alternates: { canonical: `${siteUrl}${siteRoutes.terms}` },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return <LegalDocumentPage document={termsOfUse} />
}
