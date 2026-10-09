import type { Metadata } from "next"

import { patientBinPageMetadata } from "@/lib/patients/seo"
import { StaffPatientsBinPage } from "@/lib/staff/route-pages"

export const metadata: Metadata = patientBinPageMetadata

export default async function DentistPatientsBinPage() {
  return StaffPatientsBinPage()
}
