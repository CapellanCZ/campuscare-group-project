import { Suspense } from "react"
import { notFound } from "next/navigation"

import { StateBlock } from "@/features/common/components/state-block"
import { ConsultationMode } from "@/features/physician/components/consultation-mode"
import { loadPhysicianWorkspace } from "@/features/physician/data/queries"
import { loadVisitMedicalChart } from "@/features/physician/data/visit-chart"
import { startConsultation } from "@/features/physician/actions/appointments"

type PageProps = {
  params: Promise<{ appointmentId: string }>
}

async function Content({ appointmentId }: { appointmentId: string }) {
  const workspace = await loadPhysicianWorkspace()
  const appointment = workspace.appointments.find((a) => a.id === appointmentId)

  if (!appointment) {
    notFound()
  }

  if (
    appointment.status !== "in_progress" &&
    appointment.status !== "completed" &&
    workspace.source === "live"
  ) {
    await startConsultation(appointmentId)
  }

  const patient =
    workspace.patients.find((p) => p.id === appointment.patientId) ?? null
  const consultation =
    workspace.consultations.find((c) => c.appointmentId === appointmentId) ??
    null
  const priorRecordsEmpty =
    workspace.consultations.filter(
      (c) =>
        c.patientId === appointment.patientId &&
        c.appointmentId !== appointmentId
    ).length === 0

  const chart = await loadVisitMedicalChart({
    appointmentId,
    campusId: appointment.patientStudentId ?? patient?.studentId ?? null,
  })

  return (
    <ConsultationMode
      appointment={appointment}
      patient={patient}
      consultation={consultation}
      priorRecordsEmpty={priorRecordsEmpty}
      medicalRecord={chart.record}
      nurseVitals={chart.nurseVitals}
    />
  )
}

export default async function Page({ params }: PageProps) {
  const { appointmentId } = await params

  return (
    <Suspense fallback={<StateBlock state="loading" />}>
      <Content appointmentId={appointmentId} />
    </Suspense>
  )
}
