import type { Metadata } from "next"

import { LegalDocumentPage } from "@/components/legal/legal-document-page"
import { termsOfUse } from "@/lib/legal/content"

export const metadata: Metadata = {
  title: "Terms of Use · CampusCare",
  description:
    "Terms of Use for CampusCare and the NU Dasmariñas Health Services Office.",
}

export default function TermsPage() {
  return <LegalDocumentPage document={termsOfUse} />
}
