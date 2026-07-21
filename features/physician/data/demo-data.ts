import { addDays, setHours, setMinutes, startOfDay } from "date-fns"

import type {
  DoctorAvailabilitySlot,
  PhysicianAppointment,
  PhysicianConsultation,
  PhysicianDashboardStats,
  PhysicianPatient,
} from "@/features/physician/types"
import { CLINIC_TIMEZONE } from "@/features/physician/types"

function atToday(hour: number, minute = 0, dayOffset = 0): string {
  const base = addDays(startOfDay(new Date()), dayOffset)
  return setMinutes(setHours(base, hour), minute).toISOString()
}

export const DEMO_DOCTOR = {
  id: "demo-doctor",
  fullName: "Dr. Ana Villanueva",
  email: "ana.villanueva@clinic.edu",
  title: "Attending Physician",
  licenseNumber: "MD-88421",
  timezone: CLINIC_TIMEZONE,
}

export const demoPatients: PhysicianPatient[] = [
  {
    id: "pat-1",
    fullName: "Maria Santos",
    email: "maria.santos@univ.edu",
    studentId: "2021-04521",
    phone: "+63 917 111 2233",
    dateOfBirth: "2003-04-12",
    sex: "female",
    medicalNotes: "Seasonal allergic rhinitis. No known drug allergies.",
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "pat-2",
    fullName: "James Reyes",
    email: "james.reyes@univ.edu",
    studentId: "2020-11802",
    phone: "+63 918 222 3344",
    dateOfBirth: "2002-09-03",
    sex: "male",
    medicalNotes: null,
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "pat-3",
    fullName: "Aisha Mendoza",
    email: "aisha.mendoza@univ.edu",
    studentId: "2022-00311",
    phone: "+63 919 333 4455",
    dateOfBirth: "2004-01-22",
    sex: "female",
    medicalNotes: "Migraine history. Avoids NSAIDs.",
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "pat-4",
    fullName: "Prof. Elena Cruz",
    email: "elena.cruz@univ.edu",
    studentId: "FAC-7781",
    phone: "+63 920 444 5566",
    dateOfBirth: "1985-06-18",
    sex: "female",
    medicalNotes: "Hypertension controlled with amlodipine 5mg.",
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "pat-5",
    fullName: "Carlo Lim",
    email: "carlo.lim@univ.edu",
    studentId: "2019-55201",
    phone: "+63 921 555 6677",
    dateOfBirth: "2001-11-30",
    sex: "male",
    medicalNotes: null,
    timezone: CLINIC_TIMEZONE,
  },
]

export const demoAppointments: PhysicianAppointment[] = [
  {
    id: "apt-1",
    clinicId: "clinic-1",
    doctorId: DEMO_DOCTOR.id,
    patientId: "pat-1",
    patientName: "Maria Santos",
    patientStudentId: "2021-04521",
    startsAt: atToday(9, 0),
    endsAt: atToday(9, 30),
    status: "confirmed",
    reason: "Persistent cough and mild fever",
    location: "Room 2",
    cancellationReason: null,
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "apt-2",
    clinicId: "clinic-1",
    doctorId: DEMO_DOCTOR.id,
    patientId: "pat-2",
    patientName: "James Reyes",
    patientStudentId: "2020-11802",
    startsAt: atToday(10, 0),
    endsAt: atToday(10, 30),
    status: "pending",
    reason: "Sports clearance follow-up",
    location: "Room 2",
    cancellationReason: null,
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "apt-3",
    clinicId: "clinic-1",
    doctorId: DEMO_DOCTOR.id,
    patientId: "pat-3",
    patientName: "Aisha Mendoza",
    patientStudentId: "2022-00311",
    startsAt: atToday(11, 0),
    endsAt: atToday(11, 30),
    status: "in_progress",
    reason: "Migraine evaluation",
    location: "Room 1",
    cancellationReason: null,
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "apt-4",
    clinicId: "clinic-1",
    doctorId: DEMO_DOCTOR.id,
    patientId: "pat-4",
    patientName: "Prof. Elena Cruz",
    patientStudentId: "FAC-7781",
    startsAt: atToday(14, 0),
    endsAt: atToday(14, 30),
    status: "confirmed",
    reason: "Blood pressure check",
    location: "Room 2",
    cancellationReason: null,
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "apt-5",
    clinicId: "clinic-1",
    doctorId: DEMO_DOCTOR.id,
    patientId: "pat-5",
    patientName: "Carlo Lim",
    patientStudentId: "2019-55201",
    startsAt: atToday(15, 30),
    endsAt: atToday(16, 0),
    status: "cancelled",
    reason: "Skin rash",
    location: "Room 3",
    cancellationReason: "Patient requested cancellation",
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "apt-6",
    clinicId: "clinic-1",
    doctorId: DEMO_DOCTOR.id,
    patientId: "pat-2",
    patientName: "James Reyes",
    patientStudentId: "2020-11802",
    startsAt: atToday(8, 0, -1),
    endsAt: atToday(8, 30, -1),
    status: "completed",
    reason: "Ankle sprain review",
    location: "Room 2",
    cancellationReason: null,
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "apt-7",
    clinicId: "clinic-1",
    doctorId: DEMO_DOCTOR.id,
    patientId: "pat-1",
    patientName: "Maria Santos",
    patientStudentId: "2021-04521",
    startsAt: atToday(9, 30, 1),
    endsAt: atToday(10, 0, 1),
    status: "confirmed",
    reason: "Follow-up after antibiotics",
    location: "Room 2",
    cancellationReason: null,
    timezone: CLINIC_TIMEZONE,
  },
  {
    id: "apt-8",
    clinicId: "clinic-1",
    doctorId: DEMO_DOCTOR.id,
    patientId: "pat-5",
    patientName: "Carlo Lim",
    patientStudentId: "2019-55201",
    startsAt: atToday(13, 0, -2),
    endsAt: atToday(13, 30, -2),
    status: "no_show",
    reason: "General check-up",
    location: "Room 1",
    cancellationReason: null,
    timezone: CLINIC_TIMEZONE,
  },
]

export const demoConsultations: PhysicianConsultation[] = [
  {
    id: "con-1",
    appointmentId: "apt-6",
    patientId: "pat-2",
    patientName: "James Reyes",
    symptoms: "Left ankle pain after intramural basketball",
    diagnosis: "Grade I lateral ankle sprain",
    clinicalNotes: "Mild swelling, able to bear weight. RICE advised.",
    prescription: "Ibuprofen 400mg TID x 3 days; ankle brace as needed",
    startedAt: atToday(8, 0, -1),
    completedAt: atToday(8, 25, -1),
  },
]

export const demoAvailability: DoctorAvailabilitySlot[] = [
  {
    id: "av-1",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "12:00",
    timezone: CLINIC_TIMEZONE,
    isActive: true,
  },
  {
    id: "av-2",
    dayOfWeek: 1,
    startTime: "13:00",
    endTime: "17:00",
    timezone: CLINIC_TIMEZONE,
    isActive: true,
  },
  {
    id: "av-3",
    dayOfWeek: 3,
    startTime: "09:00",
    endTime: "12:00",
    timezone: CLINIC_TIMEZONE,
    isActive: true,
  },
  {
    id: "av-4",
    dayOfWeek: 5,
    startTime: "13:00",
    endTime: "16:00",
    timezone: CLINIC_TIMEZONE,
    isActive: true,
  },
]

export function computeDashboardStats(
  appointments: PhysicianAppointment[]
): PhysicianDashboardStats {
  const now = new Date()
  const startToday = startOfDay(now).getTime()
  const endToday = addDays(startOfDay(now), 1).getTime()
  const weekStart = addDays(startOfDay(now), -now.getDay()).getTime()

  const today = appointments.filter((a) => {
    const t = new Date(a.startsAt).getTime()
    return t >= startToday && t < endToday
  })

  return {
    todayCount: today.filter((a) => a.status !== "cancelled").length,
    confirmedCount: today.filter((a) => a.status === "confirmed").length,
    inProgressCount: today.filter((a) => a.status === "in_progress").length,
    completedThisWeek: appointments.filter((a) => {
      const t = new Date(a.startsAt).getTime()
      return a.status === "completed" && t >= weekStart
    }).length,
    pendingCount: today.filter((a) => a.status === "pending").length,
    noShowCount: appointments.filter((a) => a.status === "no_show").length,
  }
}
