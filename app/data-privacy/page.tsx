import type { Metadata } from "next"

import { LegalDocumentPage } from "@/components/legal/legal-document-page"
import { dataPrivacyNotice } from "@/lib/legal/content"

export const metadata: Metadata = {
  title: "Data Privacy Notice · CampusCare",
  description:
    "Data Privacy Notice for CampusCare and the NU Dasmariñas Health Services Office.",
}

export default function DataPrivacyPage() {
  return <LegalDocumentPage document={dataPrivacyNotice} />
}
