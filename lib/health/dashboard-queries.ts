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
  // Admin ops home never shows live queue / named tickets — skip queue hydration.
  if (designation === "admin") {
    const emptyStats = computeQueueStats([])
    const kpis = await buildKpis("admin", [], [], emptyStats)
    return {
      tickets: [] as QueueTicketRow[],
      allTickets: [] as QueueTicketRow[],
      stats: emptyStats,
      boards: [],
      activity: [],
      recent: [],
      kpis,
    }
  }

  const stationFilter = stationForDesignation(designation)
  const allTickets = await getTodayQueueTickets()
  const scoped =
    designation === "physician" || designation === "dentist"
      ? allTickets.filter((t) => t.station === stationFilter)
      : allTickets

  const stats = computeQueueStats(scoped)
  const isNurse = designation === "nurse"

  // Nurse home doesn't render station boards — skip that work.
  const [boards, activity, recent, kpis] = await Promise.all([
    isNurse ? Promise.resolve([]) : getStationBoards(allTickets),
    getQueueActivity(8, allTickets),
    getRecentlyServed(6, allTickets),
    buildKpis(designation, scoped, allTickets, stats),
  ])

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
    const staffCard = {
      key: "staff",
      label: "Active staff",
      value: String(summary.staffSummary?.active ?? 0),
      description: `${summary.staffSummary?.total ?? 0} total accounts`,
    }
    const ordered = ["staff", "announcements", "completed", "certs"]
      .map((key) => (key === "staff" ? staffCard : byKey.get(key)))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .slice(0, 4)
    return { cards: ordered }
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

  if (designation === "dentist") {
    const dentalTickets = allTickets.filter((t) => t.station === "dentist")
    const waitingCount = dentalTickets.filter((t) => t.status === "waiting")
      .length
    const ongoing = dentalTickets.find((t) => t.status === "ongoing")
    const scheduleSlots = summary.schedule?.todaySlots.length ?? 0
    const nextSlot = summary.schedule?.todaySlots[0]
    const apptToday =
      summary.physicianWorkspace?.stats.todayCount ??
      dentalTickets.length

    return {
      cards: [
        {
          key: "appointments",
          label: "Today's Appointments",
          value: String(apptToday),
          description: "Dental visits today",
        },
        {
          key: "waiting",
          label: "Patients Waiting",
          value: String(waitingCount),
          description: "In your dental queue",
          lowerIsBetter: true,
        },
        {
          key: "ongoing",
          label: "Ongoing Consultation",
          value: ongoing ? "1" : "0",
          description: ongoing
            ? ongoing.patientName
            : "No consultation in progress",
        },
        {
          key: "completed",
          label: "Completed Consultations Today",
          value: String(summary.consultationStats.completedToday),
          description: "Finished dental charts",
        },
        {
          key: "schedule",
          label: "Upcoming Schedule",
          value: String(scheduleSlots),
          description: nextSlot
            ? `${summary.schedule?.todayLabel ?? "Today"} · ${nextSlot.startTime}–${nextSlot.endTime}`
            : "Manage in Profile and Settings",
        },
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
  if (designation === "nurse") {
    // Nurse KPIs are ticket-derived; skip consult/cert/announcement count queries.
    return {
      cards: [
        {
          key: "waiting",
          label: "Waiting patients",
          value: String(stats.totalWaiting),
          description: "In line now",
          lowerIsBetter: true,
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

  const announcementCount = await safeCount(() =>
    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
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

  const current = scoped.find(
    (t) => t.status === "called" || t.status === "ongoing"
  )

  if (designation === "admin") {
    void patientsToday
    void appointmentCount
    void all
    void stats
    return {
      cards: [
        {
          key: "announcements",
          label: "Published announcements",
          value: String(announcementCount),
          description: "Active clinic notices",
        },
        {
          key: "completed",
          label: "Visits recorded today",
          value: String(consultCount),
          description: "Aggregate consultations",
        },
        {
          key: "certs",
          label: "Certificates issued",
          value: String(certCount),
          description: "Issued today",
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
