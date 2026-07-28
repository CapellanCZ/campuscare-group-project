import { createClient } from "@/lib/supabase/server"
import { getStaffAccess } from "@/lib/auth/access"
import {
  computeDashboardStats,
  DEMO_DOCTOR,
  demoAppointments,
  demoAvailability,
  demoConsultations,
  demoPatients,
} from "@/features/physician/data/demo-data"
import type {
  DoctorAvailabilitySlot,
  PhysicianAppointment,
  PhysicianConsultation,
  PhysicianDashboardStats,
  PhysicianPatient,
  AppointmentStatus,
} from "@/features/physician/types"

type AppointmentRow = {
  id: string
  clinic_id: string
  doctor_id: string
  patient_id: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  reason: string | null
  location: string | null
  cancellation_reason: string | null
  patients:
    | {
        full_name: string
        student_id: string | null
        timezone: string
      }
    | {
        full_name: string
        student_id: string | null
        timezone: string
      }[]
    | null
}

function patientJoin<T extends { full_name: string }>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapAppointment(row: AppointmentRow): PhysicianAppointment {
  const patient = patientJoin(row.patients)
  return {
    id: row.id,
    clinicId: row.clinic_id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    patientName: patient?.full_name ?? "Unknown patient",
    patientStudentId: patient?.student_id ?? null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    reason: row.reason,
    location: row.location,
    cancellationReason: row.cancellation_reason,
    timezone: patient?.timezone ?? "Asia/Manila",
  }
}

export type PhysicianWorkspace = {
  source: "live" | "demo"
  doctorName: string
  doctorEmail: string
  doctorId: string
  appointments: PhysicianAppointment[]
  patients: PhysicianPatient[]
  consultations: PhysicianConsultation[]
  availability: DoctorAvailabilitySlot[]
  stats: PhysicianDashboardStats
}

function demoWorkspace(doctorName?: string, doctorEmail?: string): PhysicianWorkspace {
  return {
    source: "demo",
    doctorName: doctorName ?? DEMO_DOCTOR.fullName,
    doctorEmail: doctorEmail ?? DEMO_DOCTOR.email,
    doctorId: DEMO_DOCTOR.id,
    appointments: demoAppointments,
    patients: demoPatients,
    consultations: demoConsultations,
    availability: demoAvailability,
    stats: computeDashboardStats(demoAppointments),
  }
}

export async function loadPhysicianWorkspace(): Promise<PhysicianWorkspace> {
  const access = await getStaffAccess()

  if (!access || access.primaryRole !== "physician") {
    return demoWorkspace(access?.fullName, access?.email)
  }

  const supabase = await createClient()

  const { data: appointmentRows, error: appointmentError } = await supabase
    .from("appointments")
    .select(
      `
      id,
      clinic_id,
      doctor_id,
      patient_id,
      starts_at,
      ends_at,
      status,
      reason,
      location,
      cancellation_reason,
      patients (
        full_name,
        student_id,
        timezone
      )
    `
    )
    .eq("doctor_id", access.userId)
    .order("starts_at", { ascending: true })

  if (appointmentError) {
    console.error("physician appointments load failed", appointmentError.message)
    return demoWorkspace(access.fullName, access.email)
  }

  const appointments =
    (appointmentRows as unknown as AppointmentRow[] | null)?.map(mapAppointment) ??
    []

  const { data: patientRows } = await supabase
    .from("patients")
    .select(
      "id, full_name, email, student_id, phone, date_of_birth, sex, medical_notes, timezone"
    )
    .order("full_name", { ascending: true })

  const patients: PhysicianPatient[] =
    patientRows?.map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      studentId: p.student_id,
      phone: p.phone,
      dateOfBirth: p.date_of_birth,
      sex: p.sex,
      medicalNotes: p.medical_notes,
      timezone: p.timezone,
    })) ?? []

  const { data: consultationRows } = await supabase
    .from("appointment_consultations")
    .select(
      `
      id,
      appointment_id,
      patient_id,
      symptoms,
      diagnosis,
      clinical_notes,
      prescription,
      started_at,
      completed_at,
      patients ( full_name )
    `
    )
    .eq("doctor_id", access.userId)
    .order("created_at", { ascending: false })

  const consultations: PhysicianConsultation[] =
    consultationRows?.map((c) => {
      const patient = patientJoin(
        c.patients as { full_name: string } | { full_name: string }[] | null
      )
      return {
        id: c.id,
        appointmentId: c.appointment_id,
        patientId: c.patient_id,
        patientName: patient?.full_name ?? "Unknown patient",
        symptoms: c.symptoms ?? "",
        diagnosis: c.diagnosis ?? "",
        clinicalNotes: c.clinical_notes ?? "",
        prescription: c.prescription ?? "",
        startedAt: c.started_at,
        completedAt: c.completed_at,
      }
    }) ?? []

  const { data: availabilityRows } = await supabase
    .from("doctor_availability")
    .select("id, day_of_week, start_time, end_time, timezone, is_active")
    .eq("doctor_id", access.userId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })

  const availability: DoctorAvailabilitySlot[] =
    availabilityRows?.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.day_of_week,
      startTime: slot.start_time.slice(0, 5),
      endTime: slot.end_time.slice(0, 5),
      timezone: slot.timezone,
      isActive: slot.is_active,
    })) ?? []

  // Prefer live data; fall back to demo only when the doctor has no rows yet
  // so the UI still demonstrates empty-state handling when intentional.
  if (appointments.length === 0 && patients.length === 0) {
    return {
      ...demoWorkspace(access.fullName, access.email),
      doctorId: access.userId,
      doctorName: access.fullName,
      doctorEmail: access.email,
    }
  }

  return {
    source: "live",
    doctorName: access.fullName,
    doctorEmail: access.email,
    doctorId: access.userId,
    appointments,
    patients,
    consultations,
    availability,
    stats: computeDashboardStats(appointments),
  }
}
