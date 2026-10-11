import { ConsultationsPage } from "@/components/consultations/consultations-demo-page"
import { requireStaffModule } from "@/lib/auth/require-module"

export async function StaffConsultationsPage() {
  const access = await requireStaffModule("consultations")

  return (
    <ConsultationsPage
      access={access}
      initialList={{
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }}
      initialStats={{
        openToday: 0,
        awaitingAssessment: 0,
        inProgress: 0,
        completedToday: 0,
      }}
      hydrateFromCache
    />
  )
}
