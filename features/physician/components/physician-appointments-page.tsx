import { PageIntro } from "@/components/layout/panel-frame"
import { AppointmentsBoard } from "@/features/physician/components/appointments-board"
import type { PhysicianWorkspace } from "@/features/physician/data/queries"

type AppointmentsPageProps = {
  workspace: PhysicianWorkspace
}

export function PhysicianAppointmentsPage({ workspace }: AppointmentsPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title="Appointments"
        description="Filter by date or status. Confirm, reschedule, cancel, mark no-show, or start a consultation."
      />
      <AppointmentsBoard
        initialAppointments={workspace.appointments}
        doctorId={workspace.doctorId}
      />
    </div>
  )
}
