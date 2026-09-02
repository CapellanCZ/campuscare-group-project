"use server"

import { revalidatePath } from "next/cache"

import { getStaffAccess } from "@/lib/auth/access"
import { STAFF_ROUTE_ROLES } from "@/lib/auth/home-path"
import {
  assignQueueNumber,
  callNextTicket,
  completeNurseIntakeAndAssign,
  completeTicket,
  recallTicket,
  registerWalkIn,
  rejoinQueue,
  skipOrNoShow,
  startConsultation,
  transferTicket,
  verifyCheckIn,
} from "@/lib/health/queue-actions"
import type {
  HealthActionResult,
  NurseIntakeInput,
  PatientVitalsRecord,
  StationId,
} from "@/lib/health/types"
import { getPatientVitalsHistory } from "@/lib/health/queue-queries"

function revalidateQueueSurfaces() {
  for (const role of STAFF_ROUTE_ROLES) {
    revalidatePath(`/${role}`)
    revalidatePath(`/${role}/queue`)
  }
  revalidatePath("/queue-management")
  revalidatePath("/queue-management/display")
  revalidatePath("/display")
  for (const role of STAFF_ROUTE_ROLES) {
    revalidatePath(`/${role}/requests`)
  }
}

async function withStaff<T extends HealthActionResult>(
  run: (
    access: NonNullable<Awaited<ReturnType<typeof getStaffAccess>>>
  ) => Promise<T>
): Promise<HealthActionResult> {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) {
    return { ok: false, error: "Sign in with an approved clinic account." }
  }
  const result = await run(access)
  if (result.ok) revalidateQueueSurfaces()
  return result
}

export async function actionCallNext(station?: StationId) {
  return withStaff((access) =>
    callNextTicket({
      designation: access.designation,
      station,
      staffName: access.fullName,
      actingUserId: access.userId,
    })
  )
}

export async function actionRecallTicket(ticketId: string) {
  return withStaff((access) =>
    recallTicket({
      designation: access.designation,
      ticketId,
      staffName: access.fullName,
    })
  )
}

export async function actionStartConsultation(ticketId: string) {
  return withStaff((access) =>
    startConsultation({
      designation: access.designation,
      ticketId,
      staffName: access.fullName,
      staffUserId: access.userId,
    })
  )
}

export async function actionCompleteTicket(ticketId: string) {
  return withStaff((access) =>
    completeTicket({ designation: access.designation, ticketId })
  )
}

export async function actionSkipTicket(ticketId: string) {
  return withStaff((access) =>
    skipOrNoShow({
      designation: access.designation,
      ticketId,
      reason: "skip",
    })
  )
}

export async function actionNoShowTicket(ticketId: string) {
  return withStaff((access) =>
    skipOrNoShow({
      designation: access.designation,
      ticketId,
      reason: "no_show",
    })
  )
}

export async function actionRejoinQueue(ticketId: string) {
  return withStaff((access) =>
    rejoinQueue({ designation: access.designation, ticketId })
  )
}

export async function actionVerifyCheckIn(ticketId: string) {
  return withStaff((access) =>
    verifyCheckIn({ designation: access.designation, ticketId })
  )
}

export async function actionTransferTicket(
  ticketId: string,
  toStation: StationId
) {
  return withStaff((access) =>
    transferTicket({
      designation: access.designation,
      ticketId,
      toStation,
    })
  )
}

export async function actionCompleteNurseIntake(
  ticketId: string,
  intake: NurseIntakeInput
) {
  return withStaff((access) =>
    completeNurseIntakeAndAssign({
      designation: access.designation,
      ticketId,
      staffName: access.fullName,
      actingUserId: access.userId,
      intake,
    })
  )
}

export async function actionFetchPatientVitalsHistory(
  patientId: string,
  excludeTicketId?: string
): Promise<
  | { ok: true; data: PatientVitalsRecord[] }
  | { ok: false; error: string }
> {
  const access = await getStaffAccess()
  if (!access?.hasClinicMembership) {
    return { ok: false, error: "Sign in with an approved clinic account." }
  }
  if (access.designation !== "nurse" && access.designation !== "admin") {
    return { ok: false, error: "Only nurses can view vitals history." }
  }
  try {
    const data = await getPatientVitalsHistory(patientId, {
      excludeTicketId,
      limit: 30,
    })
    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load vitals history.",
    }
  }
}

export async function actionRegisterWalkIn(input: {
  patientName: string
  studentId?: string
  patientType?: import("@/lib/health/types").PatientType
  consultationType: string
  providerQueue: StationId
}) {
  return withStaff((access) =>
    registerWalkIn({
      designation: access.designation,
      patientName: input.patientName,
      studentId: input.studentId,
      patientType: input.patientType,
      consultationType: input.consultationType,
      providerQueue: input.providerQueue,
      staffName: access.fullName,
      actingUserId: access.userId,
    })
  )
}

export async function actionRescheduleQueueAppointment(input: {
  appointmentId: string
  preferredDate: string
  preferredTime: string
  reason: string
}) {
  return withStaff(async (access) => {
    const { rescheduleAppointmentReservation } = await import(
      "@/lib/health/appointment-queue-actions"
    )
    return rescheduleAppointmentReservation({
      appointmentId: input.appointmentId,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      reason: input.reason,
      staffName: access.fullName,
    })
  })
}

export async function actionAssignQueueNumber(
  ticketId: string,
  queueNumber: number
) {
  return withStaff((access) =>
    assignQueueNumber({
      designation: access.designation,
      ticketId,
      queueNumber,
    })
  )
}

export async function actionApproveConsultationRequest(input: {
  requestId: string
  patientName: string
  studentId?: string
  service: string
  reason?: string
}) {
  return withStaff(async () => {
    try {
      const { approveConsultationRequestRecord } = await import(
        "@/services/consultation-requests"
      )
      await approveConsultationRequestRecord({
        id: input.requestId,
        notes: input.reason ?? null,
      })
      return {
        ok: true as const,
        message: "Approved — patient queued for nurse intake.",
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not approve consultation request."
      return { ok: false as const, error: message }
    }
  })
}
