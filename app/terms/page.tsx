import type { Metadata } from "next"

import { LegalDocumentPage } from "@/components/legal/legal-document-page"
import { termsOfService } from "@/lib/legal/content"

export const metadata: Metadata = {
  title: "Terms of Service · CampusCare",
  description:
    "Terms of Service for CampusCare and the NU Dasmariñas Health Services Office.",
}

export default function TermsPage() {
  return <LegalDocumentPage document={termsOfService} />
}
