import type { Metadata } from "next"

import { patientRecordsPageMetadata } from "@/lib/patients/seo"
import { StaffPatientsPage } from "@/lib/staff/route-pages"

/** Large roster imports can exceed the default serverless limit. */
export const maxDuration = 300

export const metadata: Metadata = patientRecordsPageMetadata

export default async function PhysicianPatientsPage() {
  return StaffPatientsPage()
}
