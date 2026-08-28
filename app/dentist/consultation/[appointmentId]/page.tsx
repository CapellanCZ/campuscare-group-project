import { Suspense } from "react"
import { notFound } from "next/navigation"

import { StateBlock } from "@/features/common/components/state-block"
import { claimDentalVisit } from "@/features/dentist/actions/dental-chart"
import { DentalConsultationMode } from "@/features/dentist/components/dental-consultation-mode"
import { loadDentalVisitChart } from "@/features/dentist/data/visit-chart"
import {
  ensureVisitAppointmentForTicket,
  loadVisitAppointmentById,
} from "@/features/physician/data/ensure-visit-appointment"
import { getStaffAccess } from "@/lib/auth/access"
import { createClient } from "@/lib/supabase/server"

type PageProps = {
  params: Promise<{ appointmentId: string }>
}

function patientJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

async function resolveAppointmentId(
  appointmentId: string,
  doctorId: string
): Promise<string | null> {
  const direct = await loadVisitAppointmentById(appointmentId)
  if (direct) return appointmentId

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from("health_queue_tickets")
    .select("id")
    .or(
      `appointment_id.eq.${appointmentId},health_appointment_id.eq.${appointmentId},id.eq.${appointmentId}`
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!ticket?.id) return null

  const ensured = await ensureVisitAppointmentForTicket({
    ticketId: ticket.id as string,
    doctorId,
  })
  return ensured.ok ? ensured.appointmentId : null
}

async function Content({ appointmentId }: { appointmentId: string }) {
  const access = await getStaffAccess()
  if (!access || access.primaryRole !== "dentist") {
    notFound()
  }

  const resolvedId = await resolveAppointmentId(appointmentId, access.userId)
  if (!resolvedId) {
    return (
      <StateBlock
        state="error"
        title="Visit record not found"
        description="Start the consultation from the dentist queue so a visit appointment is created, then open the chart from there."
      />
    )
  }

  const raw = await loadVisitAppointmentById(resolvedId)
  if (!raw) {
    return (
      <StateBlock
        state="error"
        title="Could not load visit"
        description="The appointment exists but could not be loaded. Refresh the page or return to the queue and start the consultation again."
      />
    )
  }

  const patient = patientJoin(
    (
      raw as {
        patients?:
          | {
              student_id: string | null
              employee_id: string | null
              patient_type: string | null
            }
          | {
              student_id: string | null
              employee_id: string | null
              patient_type: string | null
            }[]
          | null
      }
    ).patients
  )

  const campusId =
    patient?.patient_type === "faculty"
      ? (patient.employee_id ?? patient.student_id)
      : (patient?.student_id ?? null)

  const status = String(
    (raw as { status?: string }).status ?? ""
  )
  if (status !== "in_progress" && status !== "completed") {
    await claimDentalVisit(resolvedId)
  } else if (
    !(raw as { doctor_id?: string | null }).doctor_id ||
    (raw as { doctor_id?: string | null }).doctor_id !== access.userId
  ) {
    await claimDentalVisit(resolvedId)
  }

  const visit = await loadDentalVisitChart({
    appointmentId: resolvedId,
    campusId,
  })

  return (
    <DentalConsultationMode
      appointmentId={resolvedId}
      patientName={visit.patientName}
      campusId={visit.campusId}
      initialChart={visit.chart}
      readOnly={visit.appointmentStatus === "completed"}
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
