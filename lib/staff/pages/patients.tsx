import { PatientsPage } from "@/components/patients/patients-demo-page"
import { requireStaffModule } from "@/lib/auth/require-module"

export async function StaffPatientsPage() {
  const access = await requireStaffModule("patient_records")

  return (
    <PatientsPage
      access={access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }}
      initialStats={{
        patientsOnFile: 0,
        visitedThisMonth: 0,
        flaggedAllergies: 0,
        documents: 0,
      }}
      hydrateFromCache
    />
  )
}
