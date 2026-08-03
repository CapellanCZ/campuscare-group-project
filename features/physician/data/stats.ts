import { addDays, startOfDay } from "date-fns"

import type {
  PhysicianAppointment,
  PhysicianDashboardStats,
} from "@/features/physician/types"

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
