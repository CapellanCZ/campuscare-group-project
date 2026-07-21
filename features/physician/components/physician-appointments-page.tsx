import { PageHeader } from "@/features/common/components/page-header"
import { AppointmentsBoard } from "@/features/physician/components/appointments-board"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"

type AppointmentsPageProps = {
  workspace: PhysicianWorkspace
}

export function PhysicianAppointmentsPage({ workspace }: AppointmentsPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Calendar and list workspace"
        description="Filter by date or status. Confirm, reschedule, cancel, mark no-show, or start a consultation."
      />
      <AppointmentsBoard
        initialAppointments={workspace.appointments}
        doctorId={workspace.doctorId}
        source={workspace.source}
      />
    </div>
  )
}
