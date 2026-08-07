"use server"

import { revalidatePath } from "next/cache"

import { getStaffAccess } from "@/lib/auth/access"
import { CAMPUS_CLINIC_ID } from "@/lib/auth/campus-clinic"
import type { WebRole } from "@/lib/auth/types"
import {
  clearExpiredClinicBreak,
  clearExpiredStaffBreak,
  getClinicBreakStatus,
  getClinicHours,
  getStaffBreakStatus,
  getStaffWeeklyHours,
  listStaffForHoursEditor,
} from "@/lib/availability/queries"
import { normalizeTimeHm } from "@/lib/availability/rules"
import type {
  BreakStatus,
  ClinicOfficeHour,
  DayOfWeek,
  StaffHoursPerson,
  StaffWeeklyHour,
} from "@/lib/availability/types"
import { createClient } from "@/lib/supabase/server"

export type AvailabilityActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

const REVALIDATE = [
  "/admin/settings",
  "/physician/settings",
  "/dentist/settings",
  "/nurse",
  "/nurse/dashboard",
  "/physician",
  "/physician/dashboard",
  "/dentist",
  "/dentist/dashboard",
  "/queue-management/display",
  "/display",
]

function revalidateAvailability() {
  for (const path of REVALIDATE) revalidatePath(path)
}

async function requireAccess() {
  const access = await getStaffAccess()
  if (!access) return null
  return access
}

export async function loadOfficeHoursBundle(): Promise<{
  clinicHours: ClinicOfficeHour[]
  clinicBreak: BreakStatus
  staff: StaffHoursPerson[]
}> {
  const [clinicHours, clinicBreak, staff] = await Promise.all([
    getClinicHours(),
    getClinicBreakStatus(),
    listStaffForHoursEditor(),
  ])
  return { clinicHours, clinicBreak, staff }
}

export async function loadStaffHoursBundle(userId: string): Promise<{
  slots: StaffWeeklyHour[]
  breakStatus: BreakStatus
}> {
  const [slots, breakStatus] = await Promise.all([
    getStaffWeeklyHours(userId),
    getStaffBreakStatus(userId),
  ])
  return { slots, breakStatus }
}

export async function loadMyBreakBundle(): Promise<{
  clinicBreak: BreakStatus
  staffBreak: BreakStatus
  role: WebRole | null
}> {
  const access = await requireAccess()
  if (!access) {
    return {
      clinicBreak: { isOnBreak: false, resumesAt: null, setBy: null, updatedAt: null },
      staffBreak: { isOnBreak: false, resumesAt: null, setBy: null, updatedAt: null },
      role: null,
    }
  }

  const supabase = await createClient()
  await clearExpiredClinicBreak(supabase)
  await clearExpiredStaffBreak(supabase, access.userId)

  const [clinicBreak, staffBreak] = await Promise.all([
    getClinicBreakStatus(supabase),
    getStaffBreakStatus(access.userId, supabase),
  ])

  return { clinicBreak, staffBreak, role: access.primaryRole }
}

export async function upsertClinicHoursDay(input: {
  dayOfWeek: number
  isClosed: boolean
  startTime: string | null
  endTime: string | null
}): Promise<AvailabilityActionResult> {
  const access = await requireAccess()
  if (!access || access.primaryRole !== "admin") {
    return { ok: false, error: "Only admins can edit clinic office hours." }
  }

  if (!input.isClosed) {
    if (!input.startTime || !input.endTime) {
      return { ok: false, error: "Open days need a start and end time." }
    }
    if (normalizeTimeHm(input.endTime) <= normalizeTimeHm(input.startTime)) {
      return { ok: false, error: "End time must be after start time." }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("clinic_office_hours").upsert(
    {
      clinic_id: CAMPUS_CLINIC_ID,
      day_of_week: input.dayOfWeek,
      is_closed: input.isClosed,
      start_time: input.isClosed ? null : normalizeTimeHm(input.startTime!),
      end_time: input.isClosed ? null : normalizeTimeHm(input.endTime!),
      timezone: "Asia/Manila",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clinic_id,day_of_week" }
  )

  if (error) return { ok: false, error: error.message }
  revalidateAvailability()
  return { ok: true, message: "Clinic hours saved." }
}

export async function replaceStaffWeeklyHours(input: {
  userId: string
  slots: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive?: boolean
  }>
}): Promise<AvailabilityActionResult> {
  const access = await requireAccess()
  if (!access) return { ok: false, error: "Unauthorized." }

  const isAdmin = access.primaryRole === "admin"
  const isSelf = access.userId === input.userId
  if (!isAdmin && !isSelf) {
    return { ok: false, error: "You can only edit your own schedule." }
  }
  if (
    !isAdmin &&
    access.primaryRole !== "physician" &&
    access.primaryRole !== "dentist" &&
    access.primaryRole !== "nurse"
  ) {
    return { ok: false, error: "Unauthorized." }
  }

  for (const slot of input.slots) {
    if (normalizeTimeHm(slot.endTime) <= normalizeTimeHm(slot.startTime)) {
      return { ok: false, error: "Each slot needs end time after start time." }
    }
  }

  const supabase = await createClient()
  const { error: deleteError } = await supabase
    .from("doctor_availability")
    .delete()
    .eq("doctor_id", input.userId)

  if (deleteError) return { ok: false, error: deleteError.message }

  if (input.slots.length > 0) {
    const { error } = await supabase.from("doctor_availability").insert(
      input.slots.map((slot) => ({
        clinic_id: CAMPUS_CLINIC_ID,
        doctor_id: input.userId,
        day_of_week: slot.dayOfWeek as DayOfWeek,
        start_time: normalizeTimeHm(slot.startTime),
        end_time: normalizeTimeHm(slot.endTime),
        timezone: "Asia/Manila",
        is_active: slot.isActive ?? true,
      }))
    )
    if (error) return { ok: false, error: error.message }
  }

  revalidateAvailability()
  return { ok: true, message: "Staff hours saved." }
}

export async function upsertStaffWeeklySlot(input: {
  id?: string
  userId?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  timezone?: string
  isActive?: boolean
}): Promise<AvailabilityActionResult> {
  const access = await requireAccess()
  if (!access) return { ok: false, error: "Unauthorized." }

  const targetUserId = input.userId ?? access.userId
  const isAdmin = access.primaryRole === "admin"
  if (!isAdmin && targetUserId !== access.userId) {
    return { ok: false, error: "You can only edit your own schedule." }
  }

  if (normalizeTimeHm(input.endTime) <= normalizeTimeHm(input.startTime)) {
    return { ok: false, error: "End time must be after start time." }
  }

  const supabase = await createClient()

  if (input.id) {
    const { error } = await supabase
      .from("doctor_availability")
      .update({
        day_of_week: input.dayOfWeek,
        start_time: normalizeTimeHm(input.startTime),
        end_time: normalizeTimeHm(input.endTime),
        timezone: input.timezone ?? "Asia/Manila",
        is_active: input.isActive ?? true,
      })
      .eq("id", input.id)
      .eq("doctor_id", targetUserId)

    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from("doctor_availability").insert({
      clinic_id: CAMPUS_CLINIC_ID,
      doctor_id: targetUserId,
      day_of_week: input.dayOfWeek,
      start_time: normalizeTimeHm(input.startTime),
      end_time: normalizeTimeHm(input.endTime),
      timezone: input.timezone ?? "Asia/Manila",
      is_active: input.isActive ?? true,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidateAvailability()
  return { ok: true, message: "Availability slot saved." }
}

export async function deleteStaffWeeklySlot(
  id: string,
  userId?: string
): Promise<AvailabilityActionResult> {
  const access = await requireAccess()
  if (!access) return { ok: false, error: "Unauthorized." }

  const targetUserId = userId ?? access.userId
  const isAdmin = access.primaryRole === "admin"
  if (!isAdmin && targetUserId !== access.userId) {
    return { ok: false, error: "You can only edit your own schedule." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("doctor_availability")
    .delete()
    .eq("id", id)
    .eq("doctor_id", targetUserId)

  if (error) return { ok: false, error: error.message }
  revalidateAvailability()
  return { ok: true, message: "Slot removed." }
}

export async function setClinicBreak(
  resumesAt: string
): Promise<AvailabilityActionResult> {
  const access = await requireAccess()
  if (!access) return { ok: false, error: "Unauthorized." }
  if (access.primaryRole !== "nurse" && access.primaryRole !== "admin") {
    return { ok: false, error: "Only nurses or admins can set a clinic break." }
  }

  const resumes = new Date(resumesAt)
  if (Number.isNaN(resumes.getTime()) || resumes.getTime() <= Date.now()) {
    return {
      ok: false,
      error: "Choose a future reopen time for when the clinic will accept patients again.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("clinic_break_status").upsert({
    clinic_id: CAMPUS_CLINIC_ID,
    is_on_break: true,
    resumes_at: resumes.toISOString(),
    set_by: access.userId,
    updated_at: new Date().toISOString(),
  })

  if (error) return { ok: false, error: error.message }
  revalidateAvailability()
  return { ok: true, message: "Clinic is now on break." }
}

export async function clearClinicBreak(): Promise<AvailabilityActionResult> {
  const access = await requireAccess()
  if (!access) return { ok: false, error: "Unauthorized." }
  if (access.primaryRole !== "nurse" && access.primaryRole !== "admin") {
    return { ok: false, error: "Only nurses or admins can end a clinic break." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("clinic_break_status").upsert({
    clinic_id: CAMPUS_CLINIC_ID,
    is_on_break: false,
    resumes_at: null,
    set_by: access.userId,
    updated_at: new Date().toISOString(),
  })

  if (error) return { ok: false, error: error.message }
  revalidateAvailability()
  return { ok: true, message: "Clinic break ended." }
}

export async function setStaffBreak(
  resumesAt: string
): Promise<AvailabilityActionResult> {
  const access = await requireAccess()
  if (!access) return { ok: false, error: "Unauthorized." }
  if (
    access.primaryRole !== "physician" &&
    access.primaryRole !== "dentist" &&
    access.primaryRole !== "nurse"
  ) {
    return { ok: false, error: "Only clinical staff can set a personal break." }
  }

  const resumes = new Date(resumesAt)
  if (Number.isNaN(resumes.getTime()) || resumes.getTime() <= Date.now()) {
    return {
      ok: false,
      error: "Choose a future reopen time for when you will accept transactions again.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("staff_break_status").upsert({
    user_id: access.userId,
    is_on_break: true,
    resumes_at: resumes.toISOString(),
    set_by: access.userId,
    updated_at: new Date().toISOString(),
  })

  if (error) return { ok: false, error: error.message }
  revalidateAvailability()
  return { ok: true, message: "You are now on break." }
}

export async function clearStaffBreak(): Promise<AvailabilityActionResult> {
  const access = await requireAccess()
  if (!access) return { ok: false, error: "Unauthorized." }

  const supabase = await createClient()
  const { error } = await supabase.from("staff_break_status").upsert({
    user_id: access.userId,
    is_on_break: false,
    resumes_at: null,
    set_by: access.userId,
    updated_at: new Date().toISOString(),
  })

  if (error) return { ok: false, error: error.message }
  revalidateAvailability()
  return { ok: true, message: "Break ended." }
}
