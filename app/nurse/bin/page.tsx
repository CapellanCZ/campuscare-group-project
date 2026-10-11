import type { Metadata } from "next"

import { patientBinPageMetadata } from "@/lib/patients/seo"
import { StaffPatientsBinPage } from "@/lib/staff/pages/patients-bin"

export const metadata: Metadata = patientBinPageMetadata

export default async function NursePatientsBinPage() {
  return StaffPatientsBinPage()
}
