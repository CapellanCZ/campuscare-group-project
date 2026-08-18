import { createClient } from "@/lib/supabase/server"
import { getStaffAccess } from "@/lib/auth/access"
import { computeDashboardStats } from "@/features/physician/data/stats"
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
        employee_id: string | null
        patient_type: string | null
        timezone: string
      }
    | {
        full_name: string
        student_id: string | null
        employee_id: string | null
        patient_type: string | null
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
  const campusId =
    patient?.patient_type === "faculty"
      ? (patient.employee_id ?? patient.student_id)
      : (patient?.student_id ?? null)
  return {
    id: row.id,
    clinicId: row.clinic_id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    patientName: patient?.full_name ?? "Unknown patient",
    patientStudentId: campusId,
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
  source: "live"
  doctorName: string
  doctorEmail: string
  doctorId: string
  appointments: PhysicianAppointment[]
  patients: PhysicianPatient[]
  consultations: PhysicianConsultation[]
  availability: DoctorAvailabilitySlot[]
  stats: PhysicianDashboardStats
}

function emptyWorkspace(
  doctorName: string,
  doctorEmail: string,
  doctorId: string
): PhysicianWorkspace {
  return {
    source: "live",
    doctorName,
    doctorEmail,
    doctorId,
    appointments: [],
    patients: [],
    consultations: [],
    availability: [],
    stats: computeDashboardStats([]),
  }
}

export async function loadPhysicianWorkspace(): Promise<PhysicianWorkspace> {
  const access = await getStaffAccess()

  if (!access || access.primaryRole !== "physician") {
    return emptyWorkspace(
      access?.fullName ?? "Physician",
      access?.email ?? "",
      access?.userId ?? ""
    )
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
        employee_id,
        patient_type,
        timezone
      )
    `
    )
    .eq("doctor_id", access.userId)
    .order("starts_at", { ascending: true })

  if (appointmentError) {
    console.error("physician appointments load failed", appointmentError.message)
    return emptyWorkspace(access.fullName, access.email, access.userId)
  }

  const appointments =
    (appointmentRows as unknown as AppointmentRow[] | null)?.map(mapAppointment) ??
    []

  const { data: patientRows } = await supabase
    .from("patients")
    .select(
      "id, full_name, email, student_id, employee_id, patient_type, phone, date_of_birth, sex, medical_notes, timezone"
    )
    .order("full_name", { ascending: true })

  const patients: PhysicianPatient[] =
    patientRows?.map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      studentId:
        p.patient_type === "faculty"
          ? (p.employee_id ?? p.student_id)
          : p.student_id,
      phone: p.phone,
      dateOfBirth: p.date_of_birth,
      sex: p.sex,
      medicalNotes: p.medical_notes,
      timezone: p.timezone,
    })) ?? []

  const { data: consultationRows } = await supabase
    .from("consultations")
    .select(
      `
      id,
      appointment_id,
      patient_id,
      symptoms,
      assessment,
      diagnosis,
      treatment,
      prescription,
      status,
      created_at,
      patients ( full_name )
    `
    )
    .eq("provider_type", "physician")
    .order("created_at", { ascending: false })

  const consultations: PhysicianConsultation[] =
    consultationRows?.map((c) => {
      const patient = patientJoin(
        c.patients as { full_name: string } | { full_name: string }[] | null
      )
      return {
        id: c.id,
        appointmentId: c.appointment_id ?? "",
        patientId: c.patient_id,
        patientName: patient?.full_name ?? "Unknown patient",
        symptoms: c.symptoms ?? "",
        diagnosis: c.diagnosis ?? "",
        clinicalNotes: c.assessment ?? "",
        prescription: c.prescription ?? "",
        startedAt: c.created_at,
        completedAt: c.status === "completed" ? c.created_at : null,
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
