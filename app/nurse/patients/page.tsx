import type { Metadata } from "next"

import { patientRecordsPageMetadata } from "@/lib/patients/seo"
import { StaffPatientsPage } from "@/lib/staff/pages/patients"

export const maxDuration = 300

export const metadata: Metadata = patientRecordsPageMetadata

export default async function NursePatientsPage() {
  return StaffPatientsPage()
}
