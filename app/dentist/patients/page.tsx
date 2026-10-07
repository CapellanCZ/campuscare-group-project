import type { Metadata } from "next"

import { patientRecordsPageMetadata } from "@/lib/patients/seo"
import { StaffPatientsPage } from "@/lib/staff/route-pages"

export const metadata: Metadata = patientRecordsPageMetadata

export default async function DentistPatientsPage() {
  return StaffPatientsPage()
}
