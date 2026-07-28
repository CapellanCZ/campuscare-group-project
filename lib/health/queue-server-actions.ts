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
  StationId,
} from "@/lib/health/types"

function revalidateQueueSurfaces() {
  for (const role of STAFF_ROUTE_ROLES) {
    revalidatePath(`/${role}`)
    revalidatePath(`/${role}/queue`)
  }
  revalidatePath("/queue-management")
  revalidatePath("/queue-management/display")
  revalidatePath("/display")
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
      intake,
    })
  )
}

export async function actionRegisterWalkIn(input: {
  patientName: string
  studentId?: string
  consultationType: string
  providerQueue: StationId
}) {
  return withStaff((access) =>
    registerWalkIn({
      designation: access.designation,
      patientName: input.patientName,
      studentId: input.studentId,
      consultationType: input.consultationType,
      providerQueue: input.providerQueue,
      staffName: access.fullName,
    })
  )
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
