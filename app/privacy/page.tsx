import type { Metadata } from "next"

import { LegalDocumentPage } from "@/components/legal/legal-document-page"
import { privacyPolicy } from "@/lib/legal/content"

export const metadata: Metadata = {
  title: "Privacy Policy · CampusCare",
  description:
    "Privacy Policy for CampusCare and the NU Dasmariñas Health Services Office.",
}

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyPolicy} />
}
