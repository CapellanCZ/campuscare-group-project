import { createClient } from "@/lib/supabase/server"
import type { ClinicDesignation } from "@/lib/auth/types"
import {
  computeQueueStats,
  getQueueActivity,
  getRecentlyServed,
  getStationBoards,
  getTodayQueueTickets,
} from "@/lib/health/queue-queries"
import { needsNurseIntake } from "@/lib/health/nurse-queue"
import { manilaDayBounds } from "@/lib/health/time"
import type { DashboardKpis, QueueTicketRow } from "@/lib/health/types"
import { stationForDesignation } from "@/lib/health/roles"
import type { RoleDashboardSummary } from "@/lib/health/dashboard-summary-types"

export async function getDashboardBundle(designation: ClinicDesignation) {
  const stationFilter = stationForDesignation(designation)
  const allTickets = await getTodayQueueTickets()
  const scoped =
    designation === "physician" || designation === "dentist"
      ? allTickets.filter((t) => t.station === stationFilter)
      : allTickets

  const stats = computeQueueStats(scoped)
  const boards = await getStationBoards(allTickets)
  const activity = await getQueueActivity(8, allTickets)
  const recent = await getRecentlyServed(6, allTickets)
  const kpis = await buildKpis(designation, scoped, allTickets, stats)

  return {
    tickets: scoped,
    allTickets,
    stats,
    boards,
    activity,
    recent,
    kpis,
  }
}

/** Enrich KPI cards with summary module counts after loadRoleDashboardSummary. */
export function enrichDashboardKpis(
  designation: ClinicDesignation,
  kpis: DashboardKpis,
  summary: RoleDashboardSummary,
  allTickets: QueueTicketRow[]
): DashboardKpis {
  if (designation === "admin") {
    const byKey = new Map(kpis.cards.map((c) => [c.key, c]))
    const ordered = ["requests", "patients", "queue", "completed", "certs"]
      .map((key) => byKey.get(key))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
    return {
      cards: [
        ...ordered,
        {
          key: "staff",
          label: "Active staff",
          value: String(summary.staffSummary?.active ?? 0),
          description: `${summary.staffSummary?.total ?? 0} total accounts`,
        },
      ],
    }
  }

  if (designation === "nurse") {
    const needIntake = allTickets.filter(needsNurseIntake).length
    return {
      cards: [
        {
          key: "intake",
          label: "Need intake",
          value: String(needIntake),
          description: "Waiting for vitals",
          lowerIsBetter: true,
        },
        {
          key: "pending",
          label: "Pending requests",
          value: String(summary.requests.pendingCount),
          description: "Awaiting triage",
          lowerIsBetter: true,
        },
        ...kpis.cards.filter((c) => c.key !== "pending"),
      ],
    }
  }

  if (designation === "physician" && summary.physicianWorkspace) {
    const stats = summary.physicianWorkspace.stats
    return {
      cards: [
        {
          key: "appts",
          label: "Appointments today",
          value: String(stats.todayCount),
          description: `${stats.confirmedCount} confirmed · ${stats.inProgressCount} in progress`,
        },
        ...kpis.cards,
      ],
    }
  }

  return kpis
}

async function buildKpis(
  designation: ClinicDesignation,
  scoped: QueueTicketRow[],
  all: QueueTicketRow[],
  stats: ReturnType<typeof computeQueueStats>
): Promise<DashboardKpis> {
  const supabase = await createClient()
  const { ymd, startIso, endIso } = manilaDayBounds()

  const safeCount = async (
    run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>
  ) => {
    try {
      const { count, error } = await run()
      if (error) return 0
      return count ?? 0
    } catch {
      return 0
    }
  }

  const consultCount = await safeCount(() =>
    supabase
      .from("health_consultations")
      .select("id", { count: "exact", head: true })
      .gte("visit_date", ymd)
      .lte("visit_date", ymd)
  )

  const certCount = await safeCount(() =>
    supabase
      .from("health_consultations")
      .select("id", { count: "exact", head: true })
      .gte("visit_date", ymd)
      .lte("visit_date", ymd)
      .ilike("certificate_status", "%issued%")
  )

  const appointmentCount = await safeCount(() =>
    supabase
      .from("health_appointments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lte("created_at", endIso)
  )

  const patientsToday = new Set(
    scoped.map((t) => t.studentId).filter(Boolean)
  ).size

  const current = scoped.find((t) => t.status === "called")

  if (designation === "admin") {
    return {
      cards: [
        {
          key: "requests",
          label: "Consultation requests",
          value: String(appointmentCount),
          description: "Created today",
        },
        {
          key: "patients",
          label: "Patients today",
          value: String(patientsToday || all.length),
          description: "Unique students in queue",
        },
        {
          key: "queue",
          label: "Current queue",
          value: String(stats.totalWaiting + stats.currentlyServing),
          description: "Waiting + serving",
          lowerIsBetter: true,
        },
        {
          key: "completed",
          label: "Completed consultations",
          value: String(consultCount || stats.completedToday),
          description: "Recorded today",
        },
        {
          key: "certs",
          label: "Medical certificates issued",
          value: String(certCount),
          description: "Issued today",
        },
        {
          key: "announcements",
          label: "Active announcements",
          value: "0",
          description: "Reserved for later module",
        },
      ],
    }
  }

  if (designation === "nurse") {
    return {
      cards: [
        {
          key: "pending",
          label: "Pending requests",
          value: String(appointmentCount),
          description: "Appointments today",
        },
        {
          key: "walkin",
          label: "Walk-in patients",
          value: String(stats.walkIns),
          description: "Registered walk-ins",
        },
        {
          key: "waiting",
          label: "Waiting patients",
          value: String(stats.totalWaiting),
          description: "In line now",
          lowerIsBetter: true,
        },
        {
          key: "checkedin",
          label: "Checked-in patients",
          value: String(stats.checkedIn),
          description: "Verified arrivals",
        },
        {
          key: "served",
          label: "Patients served today",
          value: String(stats.completedToday),
          description: "Completed tickets",
        },
      ],
    }
  }

  const roleLabel = designation === "dentist" ? "Dental" : "Clinic"

  return {
    cards: [
      {
        key: "patients",
        label: designation === "dentist" ? "Dental patients today" : "Patients today",
        value: String(patientsToday || scoped.length),
        description: `${roleLabel} visits`,
      },
      {
        key: "waiting",
        label: "Waiting patients",
        value: String(stats.totalWaiting),
        description: "In your queue",
        lowerIsBetter: true,
      },
      {
        key: "current",
        label: "Current consultation",
        value: current
          ? String(current.queueNumber ?? current.ticketCode)
          : "—",
        description: current?.patientName ?? "No active patient",
      },
      {
        key: "completed",
        label:
          designation === "dentist"
            ? "Completed dental consultations"
            : "Completed consultations",
        value: String(stats.completedToday),
        description: "Finished today",
      },
      {
        key: "certs",
        label:
          designation === "dentist"
            ? "Dental certificates issued"
            : "Medical certificates issued today",
        value: String(certCount),
        description: "Issued today",
      },
    ],
  }
}
